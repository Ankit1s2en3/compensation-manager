-- Runs once, on first container start, against an empty data volume.
-- Extensions are created by the Drizzle migrations so they apply to both databases.
CREATE DATABASE compensation_test OWNER comp;
