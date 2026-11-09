import classicImg from './Classic.png'
import silverImg from './Silver.png'
import goldImg from './Gold.png'
import platinumImg from './Platinum.png'
import diamondImg from './Diamond.png'
import vipImg from './VIP.png'
import eliteImg from './Elite.png'
import royalImg from './Royal.png'
import defaultMemberImg from './member.png'

export const MEMBER_TIER_IMAGES = {
  classic: classicImg,
  silver: silverImg,
  gold: goldImg,
  platinum: platinumImg,
  diamond: diamondImg,
  vip: vipImg,
  elite: eliteImg,
  royal: royalImg,
}

export function getMemberTierImage(level) {
  if (!level) return classicImg || defaultMemberImg
  const key = String(level).trim().toLowerCase()
  return MEMBER_TIER_IMAGES[key] || classicImg || defaultMemberImg
}

export {
  classicImg,
  silverImg,
  goldImg,
  platinumImg,
  diamondImg,
  vipImg,
  eliteImg,
  royalImg,
  defaultMemberImg,
}

