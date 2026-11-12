import os
import shutil
import subprocess
import tempfile
from pathlib import PurePosixPath

from django.core.files.uploadedfile import TemporaryUploadedFile


COMPRESS_ABOVE_BYTES = 12 * 1024 * 1024  # 12 MB
DEFAULT_MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB
FFMPEG_TIMEOUT_SECONDS = 300


def is_ffmpeg_available():
    return bool(shutil.which('ffmpeg'))


def _mp4_name(name):
    stem = PurePosixPath(name or 'video.mp4').stem or 'video'
    return f'{stem}.mp4'


def _run_ffmpeg_pass(ffmpeg_bin, input_path, output_path, crf=27, maxrate='1800k', bufsize='3600k', audio_bitrate='128k'):
    vf = (
        "scale='if(gt(iw,ih),min(1280,iw),min(720,iw))':"
        "'if(gt(iw,ih),min(720,ih),min(1280,ih))':force_original_aspect_ratio=decrease,"
        "scale=trunc(iw/2)*2:trunc(ih/2)*2"
    )
    cmd = [
        ffmpeg_bin,
        '-y',
        '-i', input_path,
        '-vf', vf,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', str(crf),
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', audio_bitrate,
        '-movflags', '+faststart',
        output_path,
    ]
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=FFMPEG_TIMEOUT_SECONDS,
        check=False,
    )
    return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0


def optimize_uploaded_video(
    uploaded_file,
    max_bytes=DEFAULT_MAX_VIDEO_BYTES,
    compress_above_bytes=COMPRESS_ABOVE_BYTES,
):
    """Compress large or non-MP4 uploaded videos into fast-start 720p H.264 MP4 when ffmpeg is available."""
    if not uploaded_file:
        return uploaded_file

    ffmpeg_bin = shutil.which('ffmpeg')
    if not ffmpeg_bin:
        return uploaded_file

    name = getattr(uploaded_file, 'name', '') or 'video.mp4'
    ext = os.path.splitext(name)[1].lower()
    in_size = getattr(uploaded_file, 'size', None)

    if in_size is not None and in_size <= compress_above_bytes and ext == '.mp4':
        return uploaded_file

    temp_in_path = None
    temp_out_path = None
    try:
        if hasattr(uploaded_file, 'temporary_file_path'):
            input_path = uploaded_file.temporary_file_path()
        else:
            with tempfile.NamedTemporaryFile(suffix=ext or '.mp4', delete=False) as tmp_in:
                uploaded_file.seek(0)
                for chunk in uploaded_file.chunks():
                    tmp_in.write(chunk)
                temp_in_path = tmp_in.name
                input_path = temp_in_path

        if in_size is None:
            in_size = os.path.getsize(input_path)

        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_out:
            temp_out_path = tmp_out.name

        ok = _run_ffmpeg_pass(ffmpeg_bin, input_path, temp_out_path)
        if ok and os.path.getsize(temp_out_path) > max_bytes:
            ok = _run_ffmpeg_pass(
                ffmpeg_bin,
                input_path,
                temp_out_path,
                crf=31,
                maxrate='1100k',
                bufsize='2200k',
                audio_bitrate='96k',
            )

        if not ok:
            try:
                uploaded_file.seek(0)
            except Exception:
                pass
            return uploaded_file

        out_size = os.path.getsize(temp_out_path)
        should_use_compressed = (
            out_size < in_size
            or (in_size > max_bytes and out_size <= max_bytes)
            or (ext != '.mp4' and out_size <= max_bytes)
        )
        if not should_use_compressed:
            try:
                uploaded_file.seek(0)
            except Exception:
                pass
            return uploaded_file

        compressed = TemporaryUploadedFile(
            name=_mp4_name(name),
            content_type='video/mp4',
            size=out_size,
            charset=None,
        )
        with open(temp_out_path, 'rb') as src:
            shutil.copyfileobj(src, compressed.file)
        compressed.seek(0)
        return compressed
    except Exception:
        try:
            uploaded_file.seek(0)
        except Exception:
            pass
        return uploaded_file
    finally:
        for path in (temp_in_path, temp_out_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
