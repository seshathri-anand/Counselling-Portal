CREATE DATABASE IF NOT EXISTS counselling_system;
USE counselling_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','system_admin','college_admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colleges table
CREATE TABLE IF NOT EXISTS colleges (
    college_id INT AUTO_INCREMENT PRIMARY KEY,
    college_name VARCHAR(200) NOT NULL,
    location VARCHAR(100)
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL
);

-- Seats table
CREATE TABLE IF NOT EXISTS seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    college_id INT NOT NULL,
    branch_id INT NOT NULL,
    total_seats INT NOT NULL,
    reserved_seats INT NOT NULL DEFAULT 0,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE (college_id, branch_id)
);

-- System Admins
CREATE TABLE IF NOT EXISTS system_admins (
    user_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- College Admins
CREATE TABLE IF NOT EXISTS college_admins (
    user_id INT PRIMARY KEY,
    college_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE
);

-- Student Submissions
DROP TABLE IF EXISTS student_submissions;
CREATE TABLE IF NOT EXISTS student_submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    marksheet_number VARCHAR(50) UNIQUE NOT NULL,
    physics INT CHECK (physics BETWEEN 0 AND 100),
    chemistry INT CHECK (chemistry BETWEEN 0 AND 100),
    maths INT CHECK (maths BETWEEN 0 AND 100),
    cutoff INT CHECK (cutoff BETWEEN 0 AND 200),
    dob DATE,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Students
DROP TABLE IF EXISTS students;
CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    marksheet_number VARCHAR(50) UNIQUE NOT NULL,
    academic_rank INT,
    physics INT,
    chemistry INT,
    maths INT,
    cutoff INT,
    dob DATE,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Trigger: Insert into students after submission approved
DROP TRIGGER IF EXISTS after_submission_approved;
DELIMITER $$
CREATE TRIGGER after_submission_approved
AFTER UPDATE ON student_submissions
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
        IF NOT EXISTS (SELECT 1 FROM students WHERE user_id = NEW.user_id) THEN
            INSERT INTO students (
				user_id, full_name, email, physics, chemistry, maths, cutoff, dob, marksheet_number
			) VALUES (
				NEW.user_id, NEW.full_name, NEW.email, NEW.physics, NEW.chemistry, NEW.maths, NEW.cutoff, NEW.dob, NEW.marksheet_number
			);
        END IF;
    END IF;
END$$
DELIMITER ;

-- Choices table
CREATE TABLE IF NOT EXISTS choices (
    choice_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    college_id INT NOT NULL,
    branch_id INT NOT NULL,
    preference_order INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES students(user_id) ON DELETE CASCADE,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE (user_id, preference_order),
    UNIQUE (user_id, college_id, branch_id)
);

-- Allotments table
CREATE TABLE IF NOT EXISTS allotments (
    allotment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    college_id INT,
    branch_id INT,
    choice_id INT NOT NULL,
    allotment_status ENUM('Allotted','Confirmed','Rejected','Upgraded') DEFAULT 'Allotted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (user_id,college_id,branch_id),
    FOREIGN KEY (choice_id) REFERENCES choices(choice_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES students(user_id) ON DELETE CASCADE,
    FOREIGN KEY (college_id, branch_id) REFERENCES seats(college_id, branch_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS submission_overrides;

CREATE TABLE IF NOT EXISTS submission_overrides (
    student_id INT PRIMARY KEY,
    max_attempts INT DEFAULT 3, -- overrides default 3
    expires_at TIMESTAMP NULL, -- optional expiry
    granted_by_admin_id INT, -- admin who granted override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_submissions(user_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by_admin_id) REFERENCES users(user_id) -- assuming admins are also in users table
);
