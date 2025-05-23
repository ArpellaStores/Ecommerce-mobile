// products.js
export interface Product {
  Name: string;
  Price: number;
  Image: string;
  Category: string;
  SubCategory: string;
}

export const products: Product[] = [
    // Beverages
    { Name: "Coca Cola", Price: 1.99, Image: "https://via.placeholder.com/200?text=Coca+Cola", Category: "Beverages", SubCategory: "Soft Drinks" },
    { Name: "Pepsi", Price: 1.89, Image: "https://via.placeholder.com/200?text=Pepsi", Category: "Beverages", SubCategory: "Soft Drinks" },
    { Name: "Tropicana Orange Juice", Price: 3.49, Image: "https://via.placeholder.com/200?text=Tropicana+Orange+Juice", Category: "Beverages", SubCategory: "Juices" },
    { Name: "Lipton Iced Tea", Price: 2.49, Image: "https://via.placeholder.com/200?text=Lipton+Iced+Tea", Category: "Beverages", SubCategory: "Tea & Coffee" },
    { Name: "Nestle Pure Life Water", Price: 1.29, Image: "https://via.placeholder.com/200?text=Nestle+Pure+Life+Water", Category: "Beverages", SubCategory: "Juices" },
    { Name: "Minute Maid Apple Juice", Price: 2.99, Image: "https://via.placeholder.com/200?text=Minute+Maid+Apple+Juice", Category: "Beverages", SubCategory: "Juices" },
    { Name: "Monster Energy Drink", Price: 3.99, Image: "https://via.placeholder.com/200?text=Monster+Energy+Drink", Category: "Beverages", SubCategory: "Soft Drinks" },
    { Name: "Starbucks Coffee", Price: 4.49, Image: "https://via.placeholder.com/200?text=Starbucks+Coffee", Category: "Beverages", SubCategory: "Tea & Coffee" },
    { Name: "Red Bull", Price: 2.69, Image: "https://via.placeholder.com/200?text=Red+Bull", Category: "Beverages", SubCategory: "Soft Drinks" },
    { Name: "Gatorade Lemon-Lime", Price: 2.19, Image: "https://via.placeholder.com/200?text=Gatorade+Lemon-Lime", Category: "Beverages", SubCategory: "Soft Drinks" },
    { Name: "Nescafe Instant Coffee", Price: 5.99, Image: "https://via.placeholder.com/200?text=Nescafe+Instant+Coffee", Category: "Beverages", SubCategory: "Tea & Coffee" },
    { Name: "Vita Coco Coconut Water", Price: 3.79, Image: "https://via.placeholder.com/200?text=Vita+Coco+Coconut+Water", Category: "Beverages", SubCategory: "Juices" },
    { Name: "Arizona Green Tea", Price: 1.99, Image: "https://via.placeholder.com/200?text=Arizona+Green+Tea", Category: "Beverages", SubCategory: "Tea & Coffee" },
    { Name: "Snapple Lemon Tea", Price: 2.29, Image: "https://via.placeholder.com/200?text=Snapple+Lemon+Tea", Category: "Beverages", SubCategory: "Tea & Coffee" },
    { Name: "7 Up", Price: 1.89, Image: "https://via.placeholder.com/200?text=7+Up", Category: "Beverages", SubCategory: "Soft Drinks" },
  
    // Snacks
    { Name: "Lay's Chips", Price: 2.99, Image: "https://via.placeholder.com/200?text=Lay's+Chips", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Oreo Cookies", Price: 3.29, Image: "https://via.placeholder.com/200?text=Oreo+Cookies", Category: "Snacks", SubCategory: "Cookies" },
    { Name: "Pringles", Price: 2.49, Image: "https://via.placeholder.com/200?text=Pringles", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Nature Valley Granola Bars", Price: 3.79, Image: "https://via.placeholder.com/200?text=Nature+Valley+Granola+Bars", Category: "Snacks", SubCategory: "Nuts" },
    { Name: "Almonds", Price: 5.99, Image: "https://via.placeholder.com/200?text=Almonds", Category: "Snacks", SubCategory: "Nuts" },
    { Name: "Popcorn", Price: 1.99, Image: "https://via.placeholder.com/200?text=Popcorn", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Chocolate Chip Cookies", Price: 4.99, Image: "https://via.placeholder.com/200?text=Chocolate+Chip+Cookies", Category: "Snacks", SubCategory: "Cookies" },
    { Name: "Peanut Butter Cups", Price: 2.49, Image: "https://via.placeholder.com/200?text=Peanut+Butter+Cups", Category: "Snacks", SubCategory: "Nuts" },
    { Name: "Doritos", Price: 3.49, Image: "https://via.placeholder.com/200?text=Doritos", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Kit Kat", Price: 1.89, Image: "https://via.placeholder.com/200?text=Kit+Kat", Category: "Snacks", SubCategory: "Cookies" },
    { Name: "Chex Mix", Price: 2.59, Image: "https://via.placeholder.com/200?text=Chex+Mix", Category: "Snacks", SubCategory: "Nuts" },
    { Name: "Goldfish Crackers", Price: 2.19, Image: "https://via.placeholder.com/200?text=Goldfish+Crackers", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Cheetos", Price: 3.29, Image: "https://via.placeholder.com/200?text=Cheetos", Category: "Snacks", SubCategory: "Chips" },
    { Name: "Biscoff Cookies", Price: 4.29, Image: "https://via.placeholder.com/200?text=Biscoff+Cookies", Category: "Snacks", SubCategory: "Cookies" },
    { Name: "Nature's Bakery Fig Bars", Price: 3.99, Image: "https://via.placeholder.com/200?text=Nature's+Bakery+Fig+Bars", Category: "Snacks", SubCategory: "Nuts" },
  
    // Dairy
    { Name: "Milk", Price: 2.49, Image: "https://via.placeholder.com/200?text=Milk", Category: "Dairy", SubCategory: "Milk" },
    { Name: "Cheddar Cheese", Price: 4.99, Image: "https://via.placeholder.com/200?text=Cheddar+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Greek Yogurt", Price: 1.99, Image: "https://via.placeholder.com/200?text=Greek+Yogurt", Category: "Dairy", SubCategory: "Yogurt" },
    { Name: "Mozzarella Cheese", Price: 5.49, Image: "https://via.placeholder.com/200?text=Mozzarella+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Almond Milk", Price: 3.59, Image: "https://via.placeholder.com/200?text=Almond+Milk", Category: "Dairy", SubCategory: "Milk" },
    { Name: "Butter", Price: 2.99, Image: "https://via.placeholder.com/200?text=Butter", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Cream Cheese", Price: 2.79, Image: "https://via.placeholder.com/200?text=Cream+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Yoplait Yogurt", Price: 1.29, Image: "https://via.placeholder.com/200?text=Yoplait+Yogurt", Category: "Dairy", SubCategory: "Yogurt" },
    { Name: "Cottage Cheese", Price: 3.99, Image: "https://via.placeholder.com/200?text=Cottage+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Ice Cream", Price: 4.49, Image: "https://via.placeholder.com/200?text=Ice+Cream", Category: "Dairy", SubCategory: "Yogurt" },
    { Name: "Ricotta Cheese", Price: 5.29, Image: "https://via.placeholder.com/200?text=Ricotta+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Parmesan Cheese", Price: 6.49, Image: "https://via.placeholder.com/200?text=Parmesan+Cheese", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Skim Milk", Price: 2.19, Image: "https://via.placeholder.com/200?text=Skim+Milk", Category: "Dairy", SubCategory: "Milk" },
    { Name: "Sour Cream", Price: 1.79, Image: "https://via.placeholder.com/200?text=Sour+Cream", Category: "Dairy", SubCategory: "Cheese" },
    { Name: "Kefir", Price: 3.69, Image: "https://via.placeholder.com/200?text=Kefir", Category: "Dairy", SubCategory: "Yogurt" },


    { Name: "Whole Wheat Bread", Price: 2.79, Image: "https://via.placeholder.com/200?text=Whole+Wheat+Bread", Category: "Bakery", SubCategory: "Bread" },
  { Name: "Sourdough Bread", Price: 3.29, Image: "https://via.placeholder.com/200?text=Sourdough+Bread", Category: "Bakery", SubCategory: "Bread" },
  { Name: "Croissants", Price: 4.19, Image: "https://via.placeholder.com/200?text=Croissants", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Donuts", Price: 2.49, Image: "https://via.placeholder.com/200?text=Donuts", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Chocolate Cake", Price: 5.99, Image: "https://via.placeholder.com/200?text=Chocolate+Cake", Category: "Bakery", SubCategory: "Cakes" },
  { Name: "Vanilla Cake", Price: 4.79, Image: "https://via.placeholder.com/200?text=Vanilla+Cake", Category: "Bakery", SubCategory: "Cakes" },
  { Name: "Apple Pie", Price: 3.99, Image: "https://via.placeholder.com/200?text=Apple+Pie", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Cinnamon Rolls", Price: 2.99, Image: "https://via.placeholder.com/200?text=Cinnamon+Rolls", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Banana Bread", Price: 4.49, Image: "https://via.placeholder.com/200?text=Banana+Bread", Category: "Bakery", SubCategory: "Bread" },
  { Name: "Pumpkin Pie", Price: 5.49, Image: "https://via.placeholder.com/200?text=Pumpkin+Pie", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Cheese Croissants", Price: 3.59, Image: "https://via.placeholder.com/200?text=Cheese+Croissants", Category: "Bakery", SubCategory: "Pastries" },
  { Name: "Brownies", Price: 2.79, Image: "https://via.placeholder.com/200?text=Brownies", Category: "Bakery", SubCategory: "Cakes" },
  { Name: "Lemon Cake", Price: 4.89, Image: "https://via.placeholder.com/200?text=Lemon+Cake", Category: "Bakery", SubCategory: "Cakes" },
  { Name: "Focaccia Bread", Price: 3.69, Image: "https://via.placeholder.com/200?text=Focaccia+Bread", Category: "Bakery", SubCategory: "Bread" },

  { Name: "White Rice", Price: 1.99, Image: "https://via.placeholder.com/200?text=White+Rice", Category: "Dry Foods and Staples", SubCategory: "Rice" },
  { Name: "Brown Rice", Price: 2.49, Image: "https://via.placeholder.com/200?text=Brown+Rice", Category: "Dry Foods and Staples", SubCategory: "Rice" },
  { Name: "Basmati Rice", Price: 3.29, Image: "https://via.placeholder.com/200?text=Basmati+Rice", Category: "Dry Foods and Staples", SubCategory: "Rice" },
  { Name: "Spaghetti", Price: 1.49, Image: "https://via.placeholder.com/200?text=Spaghetti", Category: "Dry Foods and Staples", SubCategory: "Pasta" },
  { Name: "Macaroni", Price: 1.79, Image: "https://via.placeholder.com/200?text=Macaroni", Category: "Dry Foods and Staples", SubCategory: "Pasta" },
  { Name: "Penne", Price: 1.89, Image: "https://via.placeholder.com/200?text=Penne", Category: "Dry Foods and Staples", SubCategory: "Pasta" },
  { Name: "Fusilli", Price: 2.29, Image: "https://via.placeholder.com/200?text=Fusilli", Category: "Dry Foods and Staples", SubCategory: "Pasta" },
  { Name: "Quinoa", Price: 3.49, Image: "https://via.placeholder.com/200?text=Quinoa", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Oats", Price: 2.99, Image: "https://via.placeholder.com/200?text=Oats", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Barley", Price: 2.59, Image: "https://via.placeholder.com/200?text=Barley", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Wheat Flour", Price: 1.99, Image: "https://via.placeholder.com/200?text=Wheat+Flour", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Cornmeal", Price: 2.29, Image: "https://via.placeholder.com/200?text=Cornmeal", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Chickpeas", Price: 3.49, Image: "https://via.placeholder.com/200?text=Chickpeas", Category: "Dry Foods and Staples", SubCategory: "Grains" },
  { Name: "Lentils", Price: 2.79, Image: "https://via.placeholder.com/200?text=Lentils", Category: "Dry Foods and Staples", SubCategory: "Grains" },

  // Condiments and Spices
  { Name: "Salt", Price: 1.29, Image: "https://via.placeholder.com/200?text=Salt", Category: "Condiments and Spices", SubCategory: "Salt" },
  { Name: "Black Pepper", Price: 1.49, Image: "https://via.placeholder.com/200?text=Black+Pepper", Category: "Condiments and Spices", SubCategory: "Pepper" },
  { Name: "Chili Powder", Price: 2.59, Image: "https://via.placeholder.com/200?text=Chili+Powder", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Cumin", Price: 2.39, Image: "https://via.placeholder.com/200?text=Cumin", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Oregano", Price: 1.99, Image: "https://via.placeholder.com/200?text=Oregano", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Thyme", Price: 1.89, Image: "https://via.placeholder.com/200?text=Thyme", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Garlic Powder", Price: 2.29, Image: "https://via.placeholder.com/200?text=Garlic+Powder", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Cinnamon", Price: 2.49, Image: "https://via.placeholder.com/200?text=Cinnamon", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Turmeric", Price: 2.69, Image: "https://via.placeholder.com/200?text=Turmeric", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Ginger Powder", Price: 2.79, Image: "https://via.placeholder.com/200?text=Ginger+Powder", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Paprika", Price: 2.39, Image: "https://via.placeholder.com/200?text=Paprika", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Mustard", Price: 1.79, Image: "https://via.placeholder.com/200?text=Mustard", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Soy Sauce", Price: 2.19, Image: "https://via.placeholder.com/200?text=Soy+Sauce", Category: "Condiments and Spices", SubCategory: "Herbs" },
  { Name: "Vinegar", Price: 1.49, Image: "https://via.placeholder.com/200?text=Vinegar", Category: "Condiments and Spices", SubCategory: "Herbs" },

  // Canned Foods
  { Name: "Canned Tomatoes", Price: 1.79, Image: "https://via.placeholder.com/200?text=Canned+Tomatoes", Category: "Canned Foods", SubCategory: "Vegetables" },
  { Name: "Canned Corn", Price: 1.49, Image: "https://via.placeholder.com/200?text=Canned+Corn", Category: "Canned Foods", SubCategory: "Vegetables" },
  { Name: "Canned Peas", Price: 1.39, Image: "https://via.placeholder.com/200?text=Canned+Peas", Category: "Canned Foods", SubCategory: "Vegetables" },
  { Name: "Canned Beans", Price: 1.59, Image: "https://via.placeholder.com/200?text=Canned+Beans", Category: "Canned Foods", SubCategory: "Vegetables" },
  { Name: "Canned Carrots", Price: 1.29, Image: "https://via.placeholder.com/200?text=Canned+Carrots", Category: "Canned Foods", SubCategory: "Vegetables" },
  { Name: "Canned Chicken", Price: 3.49, Image: "https://via.placeholder.com/200?text=Canned+Chicken", Category: "Canned Foods", SubCategory: "Meat" },
  { Name: "Canned Beef", Price: 4.99, Image: "https://via.placeholder.com/200?text=Canned+Beef", Category: "Canned Foods", SubCategory: "Meat" },
  { Name: "Canned Tuna", Price: 2.19, Image: "https://via.placeholder.com/200?text=Canned+Tuna", Category: "Canned Foods", SubCategory: "Fish" },
  { Name: "Canned Salmon", Price: 3.59, Image: "https://via.placeholder.com/200?text=Canned+Salmon", Category: "Canned Foods", SubCategory: "Fish" },
  { Name: "Canned Sardines", Price: 2.49, Image: "https://via.placeholder.com/200?text=Canned+Sardines", Category: "Canned Foods", SubCategory: "Fish" },
  { Name: "Canned Shrimp", Price: 4.29, Image: "https://via.placeholder.com/200?text=Canned+Shrimp", Category: "Canned Foods", SubCategory: "Fish" },
  { Name: "Canned Mackerel", Price: 3.19, Image: "https://via.placeholder.com/200?text=Canned+Mackerel", Category: "Canned Foods", SubCategory: "Fish" },

  // Health and Wellness
  { Name: "Vitamins", Price: 9.99, Image: "https://via.placeholder.com/200?text=Vitamins", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Multivitamins", Price: 14.99, Image: "https://via.placeholder.com/200?text=Multivitamins", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Omega-3 Capsules", Price: 12.49, Image: "https://via.placeholder.com/200?text=Omega-3+Capsules", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Protein Powder", Price: 29.99, Image: "https://via.placeholder.com/200?text=Protein+Powder", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Whey Protein", Price: 34.99, Image: "https://via.placeholder.com/200?text=Whey+Protein", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Fiber Supplements", Price: 7.99, Image: "https://via.placeholder.com/200?text=Fiber+Supplements", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Probiotics", Price: 19.99, Image: "https://via.placeholder.com/200?text=Probiotics", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Vitamin C", Price: 6.99, Image: "https://via.placeholder.com/200?text=Vitamin+C", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Magnesium", Price: 9.49, Image: "https://via.placeholder.com/200?text=Magnesium", Category: "Health and Wellness", SubCategory: "Supplements" },
  { Name: "Iron Supplements", Price: 5.99, Image: "https://via.placeholder.com/200?text=Iron+Supplements", Category: "Health and Wellness", SubCategory: "Supplements" }



  ];
  