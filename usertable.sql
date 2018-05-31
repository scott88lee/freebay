CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    pwdhash TEXT NOT NULL,
    email VARCHAR(55) NOT NULL,
    karma INT DEFAULT 0,
    address TEXT,
    pf_pic TEXT,
    u_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE messages (
    messageid SERIAL PRIMARY KEY,
    originId INT NOT NULL,
    destId INT NOT NULL,
    subject VARCHAR(55),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    msgvisible BOOLEAN NOT NULL DEFAULT TRUE,
    m_date DATE NOT NULL DEFAULT CURRENT_DATE,
    m_time TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE TABLE items (
    itemid SERIAL PRIMARY KEY,
    itemname VARCHAR(255) NOT NULL,
    description TEXT,
    imglink VARCHAR(255),
    originid INT,
    condition VARCHAR(50),
    shipping TEXT,
    itemvisible BOOLEAN DEFAULT TRUE,
    i_status VARCHAR(30),
    i_date DATE NOT NULL DEFAULT CURRENT_DATE,
    i_time TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE TABLE requests (
    requestid SERIAL PRIMARY KEY,
    reqitemid INT NOT NULL,
    requestitem VARCHAR(55) NOT NULL,
    originid INT NOT NULL,
    message TEXT,
    reqvisible BOOLEAN DEFAULT TRUE,
    r_status VARCHAR(30),
    r_date DATE NOT NULL DEFAULT CURRENT_DATE,
    r_time TIME NOT NULL DEFAULT CURRENT_TIME
);


-- "SELECT * FROM users INNER JOIN items ON users.id = items.ownerid WHERE users.id = '"+ request.cookies.userid + "'";
-- SELECT * FROM users U INNER JOIN messages M ON U.id = M.destid;

-- SELECT * FROM users INNER JOIN messages ON users.id = messages.destid;

-- SELECT
--     U.*,
--     M.originid,
--     UN.firstname,
--     M.message
-- FROM users U
-- INNER JOIN messages M ON U.id = M.destid
-- INNER JOIN users UN ON M.originid = UN.id
-- WHERE U.id = 1;