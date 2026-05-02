-- Run this in MySQL Workbench to make title optional
USE ict_community;
ALTER TABLE posts MODIFY COLUMN title VARCHAR(255) DEFAULT NULL;
