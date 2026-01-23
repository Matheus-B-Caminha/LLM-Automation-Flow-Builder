# LLM Automation Flow Builder

A visual tool for creating, configuring, and exporting LLM-based automation flows.

This project is a **Single Page Application (SPA)** built with React and Vite that allows you to design data processing flows—defining data extraction via SQL, analysis via AI, and output formatting—generating a JSON configuration file ready to be executed by a backend processing engine.

## 🚀 Features

* **Visual Flow Editor:** Drag-and-drop interface based on [React Flow](https://reactflow.dev/) to connect processing steps.
* **Supported Step Types:**
    * 🗄️ **SQL Query:** Configure queries with dynamic time windows (e.g., "last 7 days"), granularity, and closure modes.
    * 🤖 **LLM Analysis:** Define prompts with support for dynamic variables (e.g., `{{step_1}}` to use the output of a previous step).
    * 📄 **Concat:** Final data unification and formatting.
* **Real-time Validation:** Warning system to detect errors such as:
    * Disconnected steps.
    * Empty SQL queries.
    * Cyclic or invalid dependencies.
    * Use of non-existent variables in prompts.
* **Global Configuration:** Define Cron schedules, Flow Iteration (loops), and notifications.
* **JSON Export:** Generates a structured `.json` file containing all logic, dependencies, and delivery configurations.

## 🛠️ Tech Stack

* **Frontend:** React (v19), TypeScript
* **Build Tool:** Vite
* **Visualization:** React Flow
* **Styling:** Tailwind CSS
* **Icons:** Lucide React

## 📦 How to Run Locally

Ensure you have **Node.js** installed on your machine.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  **Access the application:**
    Open your browser at `http://localhost:3000` (or the port indicated in the terminal).

## 📖 How to Use

1.  **Initial Configuration:**
    * Click on the "Start / Configuration" node.
    * Define the flow name and execution frequency (Cron).
    * (Optional) Enable "Iterate Flow" to process lists of items (e.g., execute the flow for every client ID).

2.  **Adding Steps:**
    * Use the buttons in the top-left corner to add nodes: **SQL**, **LLM**, or **Concat**.
    * Connect the nodes by dragging the connection lines.

3.  **Configuring Steps:**
    * Click on a node to open the side property panel.
    * **SQL:** Write your query and configure iteration/time columns.
    * **LLM:** Write your prompt. Use the variable buttons to insert references to previous steps (e.g., `{{step_1}}`).

4.  **Export:**
    * Check for any validation warnings at the top of the screen.
    * Click **"Export JSON"** to generate and view the final configuration file.

## 📂 Project Structure

* `src/components`: UI Components (Custom Nodes, Sidebar, Modals).
* `src/utils`: Logic for generating and processing the flow JSON.
* `src/types.ts`: TypeScript type definitions (Node interfaces and final JSON structure).
* `src/constants.ts`: Default configurations (LLM Models, Placeholders).

## ⚠️ Important Note

This application is a **Builder**. It does not execute the SQL queries nor does it call the LLM API directly. Its purpose is to generate a configuration file ("blueprint") that must be interpreted by a backend orchestration system.

---
