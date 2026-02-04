import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        console.log(`Checking if user exists: ${email}`);
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        console.log(`User registered: ${newUser._id}`);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error: any) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        console.log(`User logged in: ${user._id}`);
        res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error: any) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};
