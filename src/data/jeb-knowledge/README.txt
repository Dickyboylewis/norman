JEB BLOUNT KNOWLEDGE FOLDER
============================

Drop any .txt, .md, or .csv files into this folder and Jeb will automatically
read them every time someone asks a question.

Good things to put here:
- Summaries of Jeb Blount's books (Fanatical Prospecting, Objections, Sales EQ)
- Your CRM contacts exported as CSV from Notion
- Your prospecting playbook or sales process notes
- Target sectors and ideal client profiles
- Common objections you face and how to handle them
- Notes from sales training sessions

File naming tip: Use descriptive names like "crm-contacts.csv" or 
"fanatical-prospecting-summary.txt" so you know what each file contains.

The API route reads ALL files in this folder alphabetically and includes
their contents in Jeb's context. If the total content gets very large,
it will be truncated to stay within token limits.
