import multiprocessing
import os

bind = "127.0.0.1:8000"
# Cap workers on small VPS RAM; override with GUNICORN_WORKERS=N if needed
_cpu_workers = multiprocessing.cpu_count() * 2 + 1
workers = int(os.environ.get('GUNICORN_WORKERS', min(_cpu_workers, 3)))
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
preload_app = True
accesslog = "/var/log/shadow_shop/gunicorn_access.log"
errorlog = "/var/log/shadow_shop/gunicorn_error.log"
loglevel = "warning"
capture_output = True
