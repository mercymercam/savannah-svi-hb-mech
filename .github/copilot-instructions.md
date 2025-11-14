# Project Goal
A vercel project built on vite and React to provide a web interface for analyzing the following D&D Homebrew mechanic:
"When you make a melee weapon attack with this weapon you can roll a number of d4s equal to or less than your proficiency bonus and subtract them from your attack roll. On a hit, you gain a bonus to the damage roll equal to twice the amount of d4’s subtracted from the attack roll."
For example you can elect to roll 3d4 and subtract the total from your attack roll. If you hit you gain a bonus to damage equal to twice the amount subtracted from your attack roll.

# Features
- Target AC input
- Base damage on hitting input
- Player Level input

- A chart showing expected damage over different numbers of d4s subtracted from the attack roll
- A table version of the same chart

# Technologies
- Use tanstack and Apache ECharts for charting
- Use Vite and React for the web interface
- Deploy on Vercel
- Use TypeScript for type safety
- shadcn/ui for UI components
- Tailwind CSS for styling

# TypeScript
- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

## React Guidelines
- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Use React.FC type for components with children
- Keep components small and focused

# Testing
Always use vitest for unit tests.

# Tips
DO NOT USE REQUIRE. ONLY IMPORT.