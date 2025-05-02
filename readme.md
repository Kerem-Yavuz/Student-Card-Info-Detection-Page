# Student Card OCR Management System

This project is a Node.js-based web application designed to extract student information from uploaded **student ID card images** using Optical Character Recognition (OCR). It also includes user session handling, group-based authorization, and stores parsed data in a MySQL database.

## Features

- **User authentication** using username and password (with password hashing and JWT)
- **Session management** with `express-session` and `cookie-parser`
- **Group-based authorization system** (with privilege levels for image upload, profile access, etc.)
- **Image upload and OCR processing** using Tesseract.js and Sharp
- **Storage of parsed student data** (name, surname, T.C. ID number, student ID, faculty, department)
- **Static image serving**
- **EJS templates** for rendering frontend views

## Project Goal

The system is intended to streamline the extraction of text-based information from student ID cards for administrative or academic purposes.

---

## Installation

### Requirements

- Node.js (v20 or higher recommended)
- MySQL Server
- NPM or Yarn

### Steps

1. **Clone the repository:**

```bash
git clone https://github.com/Kerem-Yavuz/Student-Card-Info-Detection-Page.git
cd Student-Card-Info-Detection-Page
