import automotiveMotorcycleImage from './Automotive_Motorcycle.png'
import babyKidsImage from './Baby_Kids.png'
import beautyPersonalCareImage from './Beauty_Personal_Care.png'
import booksStationeryImage from './Books_Stationery.png'
import electronicsTechnologyImage from './Electronics_Technology.png'
import fashionClothingImage from './Fashion_Clothing.png'
import foodGroceryImage from './Food_Grocery.png'
import giftsLifestyleImage from './Gifts_Lifestyle.png'
import homeLivingImage from './Home_Living.png'
import jewelryAccessoriesImage from './Jewelry_Accessories.png'
import petSuppliesImage from './Pet_Supplies.png'
import sportsOutdoorsImage from './Sports_Outdoors.png'

const defaultCategoryImages = new Map([
  ['automotive motorcycle', automotiveMotorcycleImage],
  ['baby kids', babyKidsImage],
  ['beauty personal care', beautyPersonalCareImage],
  ['books stationery', booksStationeryImage],
  ['electronics technology', electronicsTechnologyImage],
  ['clothes', fashionClothingImage],
  ['cloths', fashionClothingImage],
  ['clothing', fashionClothingImage],
  ['fashion clothing', fashionClothingImage],
  ['fashion and clothing', fashionClothingImage],
  ['food grocery', foodGroceryImage],
  ['gifts lifestyle', giftsLifestyleImage],
  ['home living', homeLivingImage],
  ['jewelry accessories', jewelryAccessoriesImage],
  ['pet supplies', petSuppliesImage],
  ['sports outdoors', sportsOutdoorsImage],
])

export function getCategoryImage(category) {
  if (category?.image_url) return category.image_url

  const name = category?.name?.trim().toLowerCase().replace(/[\s_&-]+/g, ' ')
  return defaultCategoryImages.get(name) ?? null
}
