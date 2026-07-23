#!/usr/bin/env node

import pkg from '@next/env';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const { loadEnvConfig } = pkg;

loadEnvConfig(process.cwd());

const { env } = await import('../env.mjs');

const { MONGODB_URI, MONGODB_DB_NAME } = env;

if (!MONGODB_URI) {
  console.error('A variável de ambiente MONGODB_URI não está definida.');
  process.exit(1);
}

const rl = readline.createInterface({ input, output });

async function ask(question) {
  const answer = await rl.question(question);
  return answer.trim();
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date }
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

(async () => {
  try {
    const email = await ask('Email do usuário: ');
    const password = await ask('Nova senha (mínimo 8 caracteres): ');

    if (!email || !password) {
      console.error('Email e senha são obrigatórios.');
      process.exitCode = 1;
      return;
    }

    if (password.length < 8) {
      console.error('A senha deve ter no mínimo 8 caracteres.');
      process.exitCode = 1;
      return;
    }

    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME || undefined
    });

    const user = await Admin.findOne({ email });

    if (!user) {
      console.error('Nenhum usuário encontrado com este email.');
      process.exitCode = 1;
      return;
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    console.log('Senha alterada com sucesso para o usuário: ' + email);
  } catch (error) {
    console.error('Erro ao alterar a senha:', error);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
})();
