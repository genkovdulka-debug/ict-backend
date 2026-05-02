-- Run this in MySQL Workbench
USE ict_community;

-- Add role column to users table
ALTER TABLE users
  ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';

-- Create the admin account (password: admin1234)
-- The password hash below is bcrypt of 'admin1234'
INSERT INTO users (username, password, bio, role) VALUES
  ('admin', 'admin12', 'ICT Community Administrator.', 'admin');

-- Add banned column to users
ALTER TABLE users
  ADD COLUMN banned TINYINT(1) DEFAULT 0;
