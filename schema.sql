DROP TABLE IF EXISTS Colors;
DROP TABLE IF EXISTS Glyphs;
DROP TABLE IF EXISTS Offers;

-- TODO write indexes once we know what we're querying for

CREATE TABLE IF NOT EXISTS Colors (
    "Owner" TEXT NOT NULL,
    Miner TEXT NOT NULL,
    Color INTEGER NOT NULL DEFAULT 16777215,
    Amount INTEGER NOT NULL DEFAULT 0,
    UNIQUE("Owner", Miner, Color)
);

CREATE TABLE IF NOT EXISTS Glyphs (
    "Hash" TEXT PRIMARY KEY,
    "Owner" TEXT NOT NULL DEFAULT '',
    Minter TEXT NOT NULL DEFAULT '',
    Width INTEGER NOT NULL DEFAULT 0,
    "Length" INTEGER NOT NULL DEFAULT 0,
    Fee INTEGER NOT NULL DEFAULT 0,
    Id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS Offers (
    Seller TEXT NOT NULL,
    Selling TEXT NOT NULL,
    Buying TEXT NOT NULL,
    Amount INTEGER NOT NULL DEFAULT 0,
    UNIQUE(Seller, Selling, Buying, Amount)
);