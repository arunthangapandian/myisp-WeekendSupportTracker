# Weekend Production Support Details

A full-stack web application to track and manage weekend production support activities.

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React 18, CSS (custom)        |
| Backend  | Node.js, Express              |
| Storage  | In-memory (server-side)       |

## Project Structure

```
Weekend Support/
├── backend/
│   ├── package.json
│   ├── server.js          # Express API server
│   └── uploads/           # Uploaded sanity sheets
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── index.css       # Global styles
│       ├── App.js          # Root component
│       ├── context/
│       │   └── AuthContext.js
│       ├── components/
│       │   ├── Header.js
│       │   ├── Sidebar.js
│       │   ├── LoginScreen.js
│       │   ├── CreateEntryForm.js
│       │   ├── EntryDetail.js
│       │   ├── SummaryCards.js
│       │   ├── AddTeamForm.js
│       │   └── TeamCard.js
│       └── utils/
│           ├── api.js      # API client
│           └── helpers.js  # Date formatting utilities
└── README.md
```

## How to Run

### Prerequisites
- **Node.js** (v16 or later) and **npm** installed

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

The API server starts at **http://localhost:5000**.

### 2. Start the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm start
```

The React app opens at **http://localhost:3000**.

### 3. Login

Use any Employee ID and Name (it's a mock login):
- **Employee ID:** `EMP001`
- **Name:** `Arun Thangapandian`

## Features

- **Mock Login** – Simple emp ID + name based authentication  
- **Create Entry** – Select release owner, pick a future date, upload sanity sheet  
- **Sidebar Navigation** – Lists all created entries with date labels ("April 4th")  
- **Summary Dashboard** – Total Teams, Members, Shift Allowances, Comp-offs  
- **Add Teams** – Dropdown selection with duplicate team validation  
- **Team Cards** – Expand/collapse with member management  
- **Member Management** – Add members, toggle shift allowance / comp-off  
- **Responsive Design** – Works on desktop, tablet, and mobile  

## API Endpoints

| Method | Endpoint                                         | Description              |
|--------|--------------------------------------------------|--------------------------|
| GET    | `/api/options/release-owners`                    | Dropdown: release owners |
| GET    | `/api/options/team-names`                        | Dropdown: team names     |
| GET    | `/api/options/lead-names`                        | Dropdown: lead names     |
| GET    | `/api/entries`                                   | List all entries         |
| GET    | `/api/entries/:id`                               | Get single entry         |
| POST   | `/api/entries`                                   | Create new entry         |
| POST   | `/api/entries/:id/teams`                         | Add team to entry        |
| DELETE | `/api/entries/:eid/teams/:tid`                   | Delete a team            |
| POST   | `/api/entries/:eid/teams/:tid/members`           | Add member to team       |
| PUT    | `/api/entries/:eid/teams/:tid/members/:mid`      | Update a member          |
| DELETE | `/api/entries/:eid/teams/:tid/members/:mid`      | Delete a member          |

## Sample Data

The backend starts with one pre-seeded entry (April 4th) containing:
- **Platform Engineering** team (3 members)
- **DevOps** team (2 members)
