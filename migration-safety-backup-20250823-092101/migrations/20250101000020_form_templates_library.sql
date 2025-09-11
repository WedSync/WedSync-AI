-- Form Templates Library Migration
-- Creates wedding industry-specific form templates

-- Photography Forms
INSERT INTO form_templates (id, vendor_type, name, fields, is_marketplace) VALUES
(gen_random_uuid(), 'photography', 'Wedding Photography Questionnaire', 
'{
  "sections": [
    {
      "title": "Wedding Details",
      "fields": [
        {"name": "wedding_date", "type": "date", "label": "Wedding Date", "required": true},
        {"name": "ceremony_venue", "type": "text", "label": "Ceremony Venue", "required": true},
        {"name": "reception_venue", "type": "text", "label": "Reception Venue", "required": true},
        {"name": "guest_count", "type": "number", "label": "Estimated Guest Count", "required": true}
      ]
    },
    {
      "title": "Photography Coverage",
      "fields": [
        {"name": "coverage_hours", "type": "number", "label": "Hours of Coverage Needed", "required": true},
        {"name": "getting_ready", "type": "checkbox", "label": "Include Getting Ready Photos"},
        {"name": "first_look", "type": "checkbox", "label": "Planning a First Look"},
        {"name": "engagement_session", "type": "checkbox", "label": "Include Engagement Session"}
      ]
    },
    {
      "title": "Style Preferences",
      "fields": [
        {"name": "photography_style", "type": "select", "label": "Preferred Photography Style", 
         "options": ["Traditional", "Photojournalistic", "Fine Art", "Dark & Moody", "Light & Airy"],
         "required": true},
        {"name": "must_have_shots", "type": "textarea", "label": "Must-Have Shots or Moments"},
        {"name": "pinterest_board", "type": "url", "label": "Pinterest Board or Inspiration Link"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'photography', 'Shot List Builder',
'{
  "sections": [
    {
      "title": "Family Formal Photos",
      "fields": [
        {"name": "immediate_family", "type": "textarea", "label": "Immediate Family Members (List Names)"},
        {"name": "extended_family", "type": "textarea", "label": "Extended Family Groups"},
        {"name": "special_groupings", "type": "textarea", "label": "Special Photo Groupings"}
      ]
    },
    {
      "title": "Detail Shots",
      "fields": [
        {"name": "rings", "type": "checkbox", "label": "Rings"},
        {"name": "dress", "type": "checkbox", "label": "Dress Details"},
        {"name": "shoes", "type": "checkbox", "label": "Shoes"},
        {"name": "invitations", "type": "checkbox", "label": "Invitations"},
        {"name": "bouquet", "type": "checkbox", "label": "Bouquet"},
        {"name": "other_details", "type": "textarea", "label": "Other Important Details"}
      ]
    }
  ]
}'::jsonb, false),

-- Catering Forms
(gen_random_uuid(), 'catering', 'Menu Selection Form',
'{
  "sections": [
    {
      "title": "Event Information",
      "fields": [
        {"name": "event_date", "type": "date", "label": "Event Date", "required": true},
        {"name": "guest_count", "type": "number", "label": "Number of Guests", "required": true},
        {"name": "service_style", "type": "select", "label": "Service Style",
         "options": ["Plated", "Buffet", "Family Style", "Cocktail", "Stations"],
         "required": true}
      ]
    },
    {
      "title": "Menu Selections",
      "fields": [
        {"name": "appetizers", "type": "multiselect", "label": "Appetizer Selections"},
        {"name": "entree_options", "type": "multiselect", "label": "Main Course Options"},
        {"name": "sides", "type": "multiselect", "label": "Side Dishes"},
        {"name": "desserts", "type": "multiselect", "label": "Dessert Options"}
      ]
    },
    {
      "title": "Bar Service",
      "fields": [
        {"name": "bar_package", "type": "select", "label": "Bar Package",
         "options": ["Full Open Bar", "Beer & Wine Only", "Signature Cocktails", "Cash Bar", "No Bar Service"]},
        {"name": "signature_drinks", "type": "textarea", "label": "Signature Cocktail Requests"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'catering', 'Dietary Requirements Form',
'{
  "sections": [
    {
      "title": "Dietary Restrictions",
      "fields": [
        {"name": "vegetarian_count", "type": "number", "label": "Number of Vegetarian Guests"},
        {"name": "vegan_count", "type": "number", "label": "Number of Vegan Guests"},
        {"name": "gluten_free_count", "type": "number", "label": "Number of Gluten-Free Guests"},
        {"name": "nut_allergies", "type": "number", "label": "Number with Nut Allergies"},
        {"name": "other_allergies", "type": "textarea", "label": "Other Allergies or Restrictions"}
      ]
    },
    {
      "title": "Children''s Meals",
      "fields": [
        {"name": "children_count", "type": "number", "label": "Number of Children (12 and under)"},
        {"name": "kids_meal_preference", "type": "select", "label": "Kids Meal Preference",
         "options": ["Chicken Tenders", "Mac & Cheese", "Mini Burgers", "Pasta", "Same as Adults"]}
      ]
    }
  ]
}'::jsonb, false),

-- DJ/Band Forms
(gen_random_uuid(), 'dj', 'Music Preferences Form',
'{
  "sections": [
    {
      "title": "Music Style",
      "fields": [
        {"name": "genres", "type": "multiselect", "label": "Preferred Music Genres",
         "options": ["Pop", "Rock", "Country", "R&B", "Hip-Hop", "Electronic", "Jazz", "Classical", "Latin"]},
        {"name": "era_preference", "type": "multiselect", "label": "Era Preferences",
         "options": ["Current Hits", "2010s", "2000s", "90s", "80s", "70s", "60s", "Oldies"]}
      ]
    },
    {
      "title": "Special Songs",
      "fields": [
        {"name": "first_dance", "type": "text", "label": "First Dance Song", "required": true},
        {"name": "parent_dances", "type": "textarea", "label": "Parent Dance Songs"},
        {"name": "processional", "type": "text", "label": "Processional Music"},
        {"name": "recessional", "type": "text", "label": "Recessional Music"},
        {"name": "last_song", "type": "text", "label": "Last Song of the Night"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'dj', 'Do Not Play List',
'{
  "sections": [
    {
      "title": "Songs to Avoid",
      "fields": [
        {"name": "do_not_play_songs", "type": "textarea", "label": "Songs to NOT Play", 
         "description": "List specific songs you do not want played"},
        {"name": "do_not_play_artists", "type": "textarea", "label": "Artists to Avoid"},
        {"name": "explicit_lyrics", "type": "select", "label": "Explicit Lyrics Policy",
         "options": ["No Explicit Content", "Radio Edits Only", "After 10pm OK", "No Restrictions"]}
      ]
    },
    {
      "title": "Guest Requests",
      "fields": [
        {"name": "guest_requests", "type": "select", "label": "How to Handle Guest Requests",
         "options": ["Play All Requests", "Check with Us First", "Use Your Judgment", "No Guest Requests"]},
        {"name": "request_notes", "type": "textarea", "label": "Additional Notes on Music"}
      ]
    }
  ]
}'::jsonb, false),

-- Venue Forms
(gen_random_uuid(), 'venue', 'Setup Requirements Form',
'{
  "sections": [
    {
      "title": "Layout Preferences",
      "fields": [
        {"name": "ceremony_setup", "type": "select", "label": "Ceremony Seating Style",
         "options": ["Traditional Rows", "Semicircle", "Circle", "Spiral", "Custom"]},
        {"name": "reception_layout", "type": "select", "label": "Reception Table Layout",
         "options": ["Round Tables", "Long Tables", "Mix of Both", "Cocktail Style"]},
        {"name": "dance_floor_size", "type": "select", "label": "Dance Floor Size",
         "options": ["Small (12x12)", "Medium (16x16)", "Large (20x20)", "Extra Large (24x24)"]}
      ]
    },
    {
      "title": "Vendor Access",
      "fields": [
        {"name": "load_in_time", "type": "time", "label": "Vendor Load-in Time", "required": true},
        {"name": "vendor_meal_count", "type": "number", "label": "Number of Vendor Meals Needed"},
        {"name": "vendor_list", "type": "textarea", "label": "List of All Vendors (Name & Service)"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'venue', 'Floor Plan Selection',
'{
  "sections": [
    {
      "title": "Space Configuration",
      "fields": [
        {"name": "ceremony_location", "type": "select", "label": "Ceremony Location",
         "options": ["Garden", "Ballroom", "Terrace", "Chapel", "Beach", "Other"]},
        {"name": "cocktail_location", "type": "select", "label": "Cocktail Hour Location",
         "options": ["Foyer", "Patio", "Garden", "Separate Room", "Same as Reception"]},
        {"name": "reception_room", "type": "select", "label": "Reception Space"},
        {"name": "rain_plan", "type": "textarea", "label": "Rain Plan (if outdoor)", "required": true}
      ]
    }
  ]
}'::jsonb, false),

-- Florist Forms
(gen_random_uuid(), 'florist', 'Bouquet & Personal Flowers Form',
'{
  "sections": [
    {
      "title": "Bridal Bouquet",
      "fields": [
        {"name": "bouquet_style", "type": "select", "label": "Bouquet Style",
         "options": ["Round", "Cascade", "Hand-tied", "Nosegay", "Composite", "Presentation"]},
        {"name": "bouquet_size", "type": "select", "label": "Bouquet Size",
         "options": ["Petite", "Medium", "Large", "Oversized"]},
        {"name": "favorite_flowers", "type": "textarea", "label": "Favorite Flowers"},
        {"name": "flowers_to_avoid", "type": "textarea", "label": "Flowers to Avoid (allergies, dislikes)"}
      ]
    },
    {
      "title": "Wedding Party Flowers",
      "fields": [
        {"name": "bridesmaid_count", "type": "number", "label": "Number of Bridesmaids"},
        {"name": "groomsmen_count", "type": "number", "label": "Number of Groomsmen"},
        {"name": "flower_girl", "type": "checkbox", "label": "Flower Girl Petals/Basket"},
        {"name": "corsages_count", "type": "number", "label": "Number of Corsages Needed"},
        {"name": "special_requests", "type": "textarea", "label": "Special Flower Requests"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'florist', 'Centerpiece & Decor Form',
'{
  "sections": [
    {
      "title": "Reception Centerpieces",
      "fields": [
        {"name": "guest_table_count", "type": "number", "label": "Number of Guest Tables", "required": true},
        {"name": "centerpiece_style", "type": "select", "label": "Centerpiece Style",
         "options": ["Tall", "Low", "Mix of Heights", "Garland", "Candles Only"]},
        {"name": "head_table_style", "type": "select", "label": "Head Table Style",
         "options": ["Garland", "Individual Arrangements", "Statement Piece", "Same as Guest Tables"]}
      ]
    },
    {
      "title": "Ceremony Decor",
      "fields": [
        {"name": "arch_arbor", "type": "checkbox", "label": "Arch or Arbor Flowers"},
        {"name": "aisle_decor", "type": "checkbox", "label": "Aisle Decorations"},
        {"name": "altar_arrangements", "type": "number", "label": "Number of Altar Arrangements"},
        {"name": "petal_toss", "type": "checkbox", "label": "Petals for Toss/Exit"}
      ]
    },
    {
      "title": "Color Palette",
      "fields": [
        {"name": "primary_colors", "type": "text", "label": "Primary Wedding Colors", "required": true},
        {"name": "accent_colors", "type": "text", "label": "Accent Colors"},
        {"name": "color_inspiration", "type": "url", "label": "Pinterest/Inspiration Link"}
      ]
    }
  ]
}'::jsonb, false);

-- Update form_templates to track usage and ratings
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_templates_vendor_type ON form_templates(vendor_type);
CREATE INDEX IF NOT EXISTS idx_form_templates_marketplace ON form_templates(is_marketplace);

-- Add RLS policies for form templates
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view form templates
CREATE POLICY "Form templates are viewable by all" ON form_templates
  FOR SELECT USING (true);

-- Only admins can insert/update/delete templates
CREATE POLICY "Only admins can manage form templates" ON form_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE role = 'admin'
    )
  );