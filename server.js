// server.js
const fastify = require('fastify')({ logger: true });
const path     = require('node:path');
const fs       = require('node:fs/promises');
const sqlite3  = require('sqlite3').verbose();

// 1) PLUGINS

// CORS (allow all for sandbox)
fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type']
});

// multipart (for file uploads)
fastify.register(require('@fastify/multipart'));

// static serve uploads/
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/'
});

// 2) DATABASE INIT

const DB_FILE = 'testdb.sqlite';
const db = new sqlite3.Database(DB_FILE, err => {
  if (err) {
    fastify.log.error('Could not open database', err);
    process.exit(1);
  }
  fastify.log.info(`Connected to ${DB_FILE}`);
});

// 3) ROUTES

// a) List users for dropdown
fastify.get('/users', (req, reply) => {
  db.all(
    'SELECT id, username, alias FROM users ORDER BY username',
    [],
    (err, rows) => {
      if (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'DB error' });
      }
      reply.send(rows);
    }
  );
});

// b) Fetch one user (including avatar field)
fastify.get('/user/:id', (req, reply) => {
  const { id } = req.params;
  db.get(
    `SELECT id, username, alias, full_name, email, avatar, created_at
     FROM users
     WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'DB error' });
      }
      if (!row) {
        return reply.code(404).send({ error: 'User not found' });
      }
      // build avatar URL
      row.avatarUrl = row.avatar ? `/uploads/${row.avatar}` : null;
      row.online = false; // placeholder
      reply.send(row);
    }
  );
});

// c) Update profile fields
fastify.put('/user/:id', (req, reply) => {
  const { id } = req.params;
  const { alias, full_name, email } = req.body;
  db.run(
    `UPDATE users
        SET alias     = ?,
            full_name = ?,
            email     = ?
      WHERE id = ?`,
    [alias, full_name, email, id],
    function(err) {
      if (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'DB error' });
      }
      if (this.changes === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      // echo back updated fields
      reply.send({ alias, full_name, email });
    }
  );
});

// d) Upload avatar and persist filename
fastify.post('/avatar/:id', async (req, reply) => {
  const { id } = req.params;
  const file = await req.file();

  if (!file) {
    return reply.code(400).send({ error: 'No file provided' });
  }
  if (!file.mimetype.startsWith('image/')) {
    return reply.code(400).send({ error: 'Only image files allowed' });
  }

  // ensure uploads dir
  const uploadDir = path.join(__dirname, 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  // derive filename
  const ext = file.mimetype.split('/')[1]; // jpeg, png, ...
  const filename = `${id}.${ext}`;
  const outPath  = path.join(uploadDir, filename);

  // write file
  const buffer = await file.toBuffer();
  await fs.writeFile(outPath, buffer);

  // update DB
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [filename, id],
      (err) => err ? reject(err) : resolve()
    );
  });

  // return public URL
  reply.send({ url: `/uploads/${filename}` });
});

// 4) START SERVER

const PORT = 3001;
fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});