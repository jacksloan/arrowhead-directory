## About

Arrowhead Directory is a directory of businesses and tradespeople in the Arrowhead region.

The initial directory is sourced from the Laundromat Bulletin Board facebook group. The source files are. Both files have the same content but in a different format.

- /Users/jack/dev/git/arrowhead-directory/laundromat-bulletin-board.docx
- /Users/jack/dev/git/arrowhead-directory/laundromat-bulletin-board.xlsx

## Goals

A simple, response interface for browsing and searching the arrowhead businesses directory. The kitchen sink page is a good spot to look for how to use and implement shadcn-svelte components: /Users/jack/dev/git/arrowhead-directory/src/routes/sink/+page.svelte

## Initial Script

Create local python script in tools/parse-directory to parse the businesses in laundromat bulletin files (whichever is easier to parse) into a JSON file in src/data/directory.json

The file is already organized by category and subcategory. Categories are things like "PERSON to PERSON" and subcategories are things like "Childcare", "Hair Salons and Barbers"

/Users/jack/dev/git/arrowhead-directory/laundromat-bulletin-board.docx
/Users/jack/dev/git/arrowhead-directory/laundromat-bulletin-board.pdf

### Layout

- Nav
  - single hamburger menu on the left
  - light/dark mode on the right
- Pages
  - Directory (home)
    - Single search bar at the top for quick filter, filter icon to the right of the search bar for advanced filters
    - Table of results
    - When logged in, editors can in-line edit their own entries.
    - They should also see an add button to add new entries, they can only add new entries using their email address.
  - About
    - Add Chuck Heller email
    - Buy Chuck a coffee (he is the primary admin)
    - Buy me a coffee (I drink 3 cracked pepper cortados a day and it's expensive)
  - Login (Magic email links with supabase)
- Very minimal Responsive design using shadcn-svelte components
- Integrate with Supabase for user authentication and data storage
- Implement Prisma for database ORM
- Develop a backend API for managing directory entries

## Auth

Uses Supabase for magic email authentication and supabase for an ORM.

## Database

### Tables

- business
  - id
  - business name
  - email
  - phone
  - address
  - website
  - description
  - category
  - subcategory
  - metadata (based on category and subcategory, metadata is a json object with a version and a list of fields). For example, a septic installer might list their license number, hours of operation.
  - image
  - created_at
  - updated_at
- business_services (tag like list of services that the business provides)
  - e.g. Dirt Work, Septic Design Septic Installs, Landscaping
- business_metadata (json)
  - category
  - subcategory
  - version
  - fields (dynamic form fields)

## Future Ideas

Do not implement these, they are just ideas for the future

- Suggestions: add a place for anyone to suggest businesses
- Feature Suggestions: add a place for users to suggest features
  - users add a suggestion
  - admins can approve or reject suggestions
  - approved suggestions trigger a github issue and trigger claude to create a preview release, the preview link is emailed to Chuck and Jack for review and testing
  - users can vote on suggestions
