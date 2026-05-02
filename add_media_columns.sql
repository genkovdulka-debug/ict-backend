-- Run this in MySQL Workbench to add media support to posts table
USE ict_community;

ALTER TABLE posts
  ADD COLUMN media_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN media_type ENUM('image', 'video') DEFAULT NULL;
