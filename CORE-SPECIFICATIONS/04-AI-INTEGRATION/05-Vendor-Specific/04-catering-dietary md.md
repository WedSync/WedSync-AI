# 04-catering-dietary.md

## What to Build

Dietary requirement management and menu suggestion system for caterers.

## Key Technical Requirements

### Dietary Analyzer

```
interface DietarySystem {
  restrictions: {
    allergies: ['nuts', 'shellfish', 'dairy', 'gluten', 'eggs'],
    diets: ['vegan', 'vegetarian', 'kosher', 'halal', 'keto'],
    medical: ['diabetic', 'celiac', 'lactose-intolerant']
  }
  
  async analyzeCompatibility(menu: MenuItem[], requirements: string[]) {
    const conflicts = []
    
    for (const item of menu) {
      for (const req of requirements) {
        if (this.hasConflict(item.ingredients, req)) {
          conflicts.push({ item, requirement: req })
        }
      }
    }
    
    return conflicts
  }
}
```

### Menu Generator

```
class MenuAI {
  async generateMenu(request: MenuRequest) {
    const prompt = `Create wedding menu:
      Guest Count: ${request.guestCount}
      Dietary: ${request.dietary.join(', ')}
      Style: ${[request.style](http://request.style)}
      Budget: ${request.budgetPerPerson}
      
      Return 3 course options with ingredients and dietary notes`,
      model: 'gpt-4',
      temperature: 0.7
    })
    
    return this.validateMenu(generated, request.dietary)
  }
  
  async validateMenu(menu: any, requirements: string[]): Promise<MenuValidation> {
    const issues = []
    
    for (const course of [menu.courses](http://menu.courses)) {
      for (const dish of course.dishes) {
        const conflicts = this.checkDietaryConflicts(dish, requirements)
        if (conflicts.length > 0) {
          issues.push({
            dish: [dish.name](http://dish.name),
            conflicts,
            suggestions: await this.suggestAlternatives(dish, conflicts)
          })
        }
      }
    }
    
    return { menu, issues, isValid: issues.length === 0 }
  }
}
```

### Ingredient Intelligence

```
class IngredientAnalyzer {
  private allergenDatabase = {
    nuts: ['almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts'],
    shellfish: ['shrimp', 'lobster', 'crab', 'scallops', 'mussels', 'clams'],
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey'],
    gluten: ['wheat', 'barley', 'rye', 'oats', 'malt', 'bread crumbs'],
    eggs: ['egg', 'mayonnaise', 'meringue', 'custard']
  }
  
  hasAllergen(ingredients: string[], allergen: string): boolean {
    const allergenIngredients = this.allergenDatabase[allergen] || []
    
    return ingredients.some(ingredient => 
      allergenIngredients.some(allergenItem => 
        ingredient.toLowerCase().includes(allergenItem.toLowerCase())
      )
    )
  }
  
  suggestSubstitutes(ingredient: string, restriction: string): string[] {
    const substitutes = {
      dairy: {
        'butter': ['vegan butter', 'coconut oil', 'olive oil'],
        'milk': ['almond milk', 'oat milk', 'coconut milk'],
        'cheese': ['nutritional yeast', 'vegan cheese', 'cashew cream']
      },
      gluten: {
        'flour': ['almond flour', 'rice flour', 'coconut flour'],
        'bread': ['gluten-free bread', 'lettuce wraps', 'rice paper']
      }
    }
    
    return substitutes[restriction]?.[ingredient.toLowerCase()] || []
  }
}
```

### Portion Calculator

```
class PortionCalculator {
  calculateServings(guestCount: number, courses: Course[]): PortionPlan {
    const buffer = 1.1 // 10% buffer
    const adjustedCount = Math.ceil(guestCount * buffer)
    
    return {
      totalGuests: guestCount,
      prepCount: adjustedCount,
      courses: [courses.map](http://courses.map)(course => ({
        ...course,
        totalPortions: adjustedCount,
        ingredientAmounts: this.calculateIngredients(course, adjustedCount)
      }))
    }
  }
  
  private calculateIngredients(course: Course, servings: number): IngredientAmount[] {
    return [course.baseIngredients.map](http://course.baseIngredients.map)(ingredient => ({
      name: [ingredient.name](http://ingredient.name),
      amount: ingredient.perServing * servings,
      unit: ingredient.unit,
      cost: ingredient.costPerUnit * ingredient.perServing * servings
    }))
  }
}
```

### API Endpoints

```
// Generate menu suggestions
POST /api/catering/menu/generate
{
  guestCount: number,
  dietary: string[],
  style: string,
  budgetPerPerson: number
}

// Check dietary conflicts
POST /api/catering/menu/check-dietary
{
  menu: MenuItem[],
  requirements: string[]
}

// Calculate portions and costs
POST /api/catering/portions/calculate
{
  menu: Course[],
  guestCount: number
}
```

```

```

## Critical Implementation Notes

- Cross-contamination warnings for severe allergies
- Portion calculations include 10% buffer
- Ingredient substitution suggestions

## Menu Database

```
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  name TEXT,
  ingredients TEXT[],
  allergens TEXT[],
  dietary_tags TEXT[],
  portions_per_batch INTEGER,
  cost_per_portion DECIMAL(10,2)
);
```