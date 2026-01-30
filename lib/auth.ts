
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from './server-config';

const SECRET = SERVER_CONFIG.JWT_SECRET;

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12); // High security factor
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const signToken = (payload: any) => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
};
