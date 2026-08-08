CREATE DATABASE IF NOT EXISTS booking_configuration;
USE booking_configuration;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resource_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(255) NOT NULL DEFAULT 'meeting_room',
  color VARCHAR(255) NOT NULL DEFAULT 'purple',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  location VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  available TINYINT(1) NOT NULL DEFAULT 1,
  image VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  available TINYINT(1) NOT NULL DEFAULT 1,
  image VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(50) NOT NULL,
  user_id INT NULL,
  user_name VARCHAR(255) NOT NULL DEFAULT 'User',
  resource_id INT NULL,
  resource VARCHAR(255) NOT NULL,
  date VARCHAR(255) NOT NULL,
  time VARCHAR(255) NOT NULL DEFAULT '',
  datetime_label VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
  amount VARCHAR(50) NOT NULL DEFAULT '₹0.00',
  start_time VARCHAR(255) NOT NULL DEFAULT '',
  end_time VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_resource FOREIGN KEY (resource_id) REFERENCES resources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  context VARCHAR(100) NOT NULL DEFAULT 'study',
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO users (email, password, name, role) VALUES
  ('admin@example.com', '$2a$10$VF8fBK0EF/jf.51sbAR0dednSeVq0DQ6aY.QLQSrBzRi0.dFybYP.', 'System Admin', 'admin'),
  ('user@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Ananya', 'user'),
  ('rohan@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Rohan', 'user'),
  ('neha@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Neha', 'user'),
  ('arjun@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Arjun', 'user'),
  ('priya@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Priya', 'user');

INSERT IGNORE INTO resource_types (name, icon, color, description) VALUES
  ('Study Rooms', 'meeting_room', 'purple', 'Quiet study spaces for individual and group work.'),
  ('Conference Rooms', 'groups', 'blue', 'Meeting rooms equipped for presentations and calls.'),
  ('Labs', 'science', 'green', 'Equipped laboratories for academic and research use.'),
  ('Equipment', 'developer_board', 'orange', 'Specialized equipment available for booking.'),
  ('Auditoriums', 'theaters', 'red', 'Large venues for events, seminars, and workshops.'),
  ('Outdoor Spaces', 'park', 'teal', 'Open-air areas for gatherings and activities.');

INSERT IGNORE INTO resources (name, type, capacity, location, description, available, image) VALUES
  ('Study Room A101', 'Study Room', 6, 'Building A, 1st Floor', 'Quiet study room with tables and power outlets.', 1, ''),
  ('Study Room A102', 'Study Room', 4, 'Building A, 1st Floor', 'Small study room suitable for individual study.', 1, ''),
  ('Study Room A103', 'Study Room', 8, 'Building A, 1st Floor', 'Large study room suitable for groups.', 0, ''),
  ('Study Room B201', 'Study Room', 8, 'Building B, 2nd Floor', 'Spacious study room with natural lighting.', 1, ''),
  ('Meeting Room M1', 'Meeting Room', 10, 'Main Building, 1st Floor', 'Meeting room with presentation facilities.', 1, ''),
  ('Conference Room 1', 'Conference Room', 12, 'Floor 3', 'Large conference room.', 1, ''),
  ('Lab 4C', 'Lab', 20, 'Floor 4', 'Computer laboratory.', 1, ''),
  ('Projector Kit A', 'Equipment', 1, 'Reception', 'Portable projector kit.', 0, '');

INSERT IGNORE INTO rooms (name, capacity, available, image) VALUES
  ('Study Room A101', 4, 1, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80'),
  ('Study Room A102', 4, 1, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80'),
  ('Study Room B201', 8, 1, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80');

INSERT IGNORE INTO bookings (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label, status, amount, start_time, end_time) VALUES
  ('BK1001', 2, 'Ananya', 1, 'Study Room A101', '24 May 2024', '10:00 AM', '24 May 2024', 'Confirmed', '₹15.00', '10:00 AM', '12:00 PM'),
  ('BK1002', 3, 'Rohan', 2, 'Study Room A102', '24 May 2024', '11:00 AM', '24 May 2024', 'Confirmed', '₹15.00', '11:00 AM', '12:00 PM'),
  ('BK1003', 4, 'Neha', 4, 'Study Room B201', '25 May 2024', '02:00 PM', '25 May 2024', 'Pending', '₹20.00', '02:00 PM', '04:00 PM'),
  ('BK1004', 5, 'Arjun', 7, 'Lab 4C (Equipment)', '25 May 2024', '04:00 PM', '25 May 2024', 'Cancelled', '₹25.00', '04:00 PM', '05:00 PM'),
  ('BK1005', 6, 'Priya', 6, 'Conference Room 1', '20 May 2024', '09:00 AM', '20 May 2024', 'Completed', '₹30.00', '09:00 AM', '10:00 AM');

INSERT IGNORE INTO pricing_rules (context, data) VALUES
  ('study', '{"hourlyRate":50,"freeFirstHour":true,"peakStart":"17:00","peakEnd":"22:00"}');

INSERT IGNORE INTO settings (id, data) VALUES
  (1, '{"theme":"light","currency":"INR"}');
