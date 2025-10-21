AI Nutrition & Meal Planner :-
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


=> About The Project

Managing nutrition and planning meals can be complex and time-consuming. This project is a full-stack web application designed to simplify this process through an intelligent, user-friendly platform.

Users can register and log in to a personal dashboard where they can track their daily meals. By simply describing a meal, the application leverages the power of AI to fetch detailed nutritional information, making the logging process effortless and accurate.

Beyond tracking, the app provides a smart daily calorie budget, automatically generates grocery lists based on the meals a user has logged, and even includes an AI chat assistant to answer dietary questions. The goal is to provide a seamless and powerful tool for anyone looking to take control of their health and diet. The entire application is built with a modern MERN stack, ensuring a fast, secure, and responsive experience.

------------------------------------------------------------------------------------------------------------------------------------

=> Key Features

* **AI-Powered Nutrition Analysis**: Fetches detailed nutritional data from plain text descriptions.
* **Secure User Authentication**: Robust user registration and login system using JSON Web Tokens (JWT).
* **Interactive Meal & Calorie Tracking**: Log meals, view daily summaries, and manage a smart calorie budget.
* **Automatic Grocery List Generation**: Creates a shopping list based on your logged meals.
* **Cloud Image Uploads**: Attach meal photos that are stored persistently on Cloudinary.
* **Responsive & Modern UI**: A clean user interface built with React, Vite, and Bootstrap 5 that works on any device.

------------------------------------------------------------------------------------------------------------------------------------

=> Technology Stack

* **Frontend**: React, Vite, React Router, Axios, Chart.js, Bootstrap 5
* **Backend**: Node.js, Express.js, Mongoose
* **Database**: MongoDB Atlas
* **Authentication**: JSON Web Tokens (JWT)
* **AI & Services**: Perplexity API
* **File Handling**: Multer, Cloudinary
* **Deployment**: Vercel (Frontend), Render (Backend)

------------------------------------------------------------------------------------------------------------------------------------

=> Local Setup Instructions

1.  **Clone the repository** and navigate into the directory.
2.  **Install dependencies** for both the client and server.
    ```bash
    cd server && npm install
    cd ../client && npm install
    ```
3.  **Configure Environment Variables**:
    * In `server/`, create a `.env` file from `.env.example` and add your MongoDB URI, JWT Secret, and other API keys.
    * In `client/`, create a `.env` file from `.env.example` and add the server's base URL.
4.  **Run the application**:
    ```bash
    # Run the backend server (from /server directory)
    npm run dev

    # Run the frontend client (from /client directory)
    npm run dev
    ```
    The app will be running at `http://localhost:5173`.

------------------------------------------------------------------------------------------------------------------------------------

=> Deployment

* **Backend (Render)**: Set the root directory to `server`, build command to `npm install`, and start command to `node src/index.js`.
* **Frontend (Vercel)**: Set the root directory to `client` and use the "Vite" framework preset.
