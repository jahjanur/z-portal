import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyJWT, verifyAdmin } from "../middleware/auth";
import { notifyProfileCompleted } from "../services/notifications";

const router = Router();
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const filesDir = "uploads/files";
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
    cb(null, "file-" + uniqueSuffix + "-" + sanitizedName);
  },
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// get all users
router.get("/", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ 
      select: { 
        id: true,
        email: true, 
        role: true, 
        name: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        postalAddress: true,
        address: true,
        phoneNumber: true,
      } 
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// get user invite token
router.get("/by-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        logo: true,
        address: true,
        postalAddress: true,
        phoneNumber: true,
        extraEmails: true,
        brandPattern: true,
        shortInfo: true,
        inviteExpires: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid token" });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return res.status(400).json({ error: "Token has expired" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user by token:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// post resend invite email
router.post("/:id/resend-invite", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user || user.role !== "CLIENT") {
      return res.status(404).json({ error: "Client not found" });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { inviteToken, inviteExpires },
    });

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/complete-profile?token=${inviteToken}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: 'Complete Your Company Profile - Reminder',
        html: `
          <h2>Hi ${user.name}!</h2>
          <p>This is a reminder to complete your company profile:</p>
          <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
          <p>This link will expire in 7 days.</p>
        `,
      });
      console.log(`✅ Invite email sent to ${user.email}`);
      res.json({ message: 'Invite email sent successfully' });
    } catch (emailError) {
      console.error("❌ Error sending email:", emailError);
      res.status(500).json({ error: 'Failed to send invite email' });
    }
  } catch (error) {
    console.error("Error resending invite:", error);
    res.status(500).json({ error: "Failed to resend invite" });
  }
});

// get user if
router.get("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        address: true,
        postalAddress: true,
        phoneNumber: true,
        extraEmails: true,
        brandPattern: true,
        shortInfo: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// create user
router.post("/", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      role, 
      name, 
      company, 
      logo, 
      colorHex, 
      postalAddress,
      domainName
    } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: "Email, password, role, and name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const roleNormalized = role.toUpperCase();

    if (!["ADMIN", "WORKER", "CLIENT"].includes(roleNormalized)) {
      return res.status(400).json({ error: "Invalid role. Must be ADMIN, WORKER, or CLIENT" });
    }

    let inviteToken = null;
    let inviteExpires = null;
    
    if (roleNormalized === "CLIENT") {
      inviteToken = crypto.randomBytes(32).toString('hex');
      inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const userData: any = {
      email,
      password: hashedPassword,
      role: roleNormalized,
      name,
    };

    if (roleNormalized === "CLIENT") {
      userData.company = company || null;
      userData.logo = logo || null;
      userData.colorHex = colorHex || "#5B4FFF";
      userData.postalAddress = postalAddress || null;
      userData.profileStatus = "INCOMPLETE";
      userData.inviteToken = inviteToken;
      userData.inviteExpires = inviteExpires;
    }

    const newUser = await prisma.user.create({
      data: userData,
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true,
        company: true,
        logo: true,
        colorHex: true,
        createdAt: true,
        profileStatus: true,
        postalAddress: true,
      },
    });

    if (roleNormalized === "CLIENT" && domainName) {
      try {
        await prisma.domain.create({
          data: {
            clientId: newUser.id,
            domainName,
            isPrimary: true,
          }
        });
        console.log(`✅ Domain ${domainName} created for client ${newUser.id}`);
      } catch (domainError) {
        console.error("❌ Error creating domain:", domainError);
      }
    }

    if (roleNormalized === "CLIENT" && inviteToken) {
      const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/complete-profile?token=${inviteToken}`;
      
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: 'Complete Your Company Profile',
          html: `
            <h2>Welcome ${name}!</h2>
            <p>Please complete your company profile by clicking the link below:</p>
            <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
            <p>This link will expire in 7 days.</p>
          `,
        });
        console.log(`✅ Invite email sent to ${email}`);
      } catch (emailError) {
        console.error("❌ Error sending invite email:", emailError);
      }
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// post complete profile
router.post("/complete-profile", uploadFile.array("files", 10), async (req, res) => {
  try {
    const {
      token,
      address,
      postalAddress,
      phoneNumber,
      extraEmails,
      brandPattern,
      shortInfo,
      logoIndex,
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return res.status(400).json({ error: "Invite token has expired" });
    }

    const updateData: any = {
      address,
      postalAddress,
      phoneNumber,
      extraEmails,
      brandPattern,
      shortInfo,
      profileStatus: "COMPLETE",
      inviteToken: null,
      inviteExpires: null,
    };

    const files = req.files as Express.Multer.File[];
    let logoPath = user.logo;

    // NEW: Create profile files directory for this user
    const profileFilesDir = `uploads/profile-files/${user.id}`;
    if (!fs.existsSync(profileFilesDir)) {
      fs.mkdirSync(profileFilesDir, { recursive: true });
    }

    if (files && files.length > 0) {
      // NEW: Copy all uploaded files to user's profile folder
      for (const file of files) {
        const sourcePath = path.join(filesDir, file.filename);
        const destPath = path.join(profileFilesDir, file.filename);
        
        try {
          fs.copyFileSync(sourcePath, destPath);
        } catch (copyError) {
          console.error("Error copying file:", copyError);
        }
      }

      // Select logo (existing logic - unchanged)
      if (logoIndex !== undefined) {
        const logoIdx = parseInt(logoIndex);
        if (logoIdx >= 0 && logoIdx < files.length) {
          logoPath = `/uploads/files/${files[logoIdx].filename}`;
        }
      } 
      else if (!user.logo) {
        const firstImage = files.find(f => f.mimetype.startsWith('image/'));
        if (firstImage) {
          logoPath = `/uploads/files/${firstImage.filename}`;
        } else {
          logoPath = `/uploads/files/${files[0].filename}`;
        }
      }
    }

    updateData.logo = logoPath;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        logo: true,
        profileStatus: true,
      },
    });

    await notifyProfileCompleted({
      name: updatedUser.name,
      email: updatedUser.email,
      company: updatedUser.company || undefined
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error completing profile:", error);
    res.status(500).json({ error: "Failed to complete profile" });
  }
});

// delete user
router.delete("/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// get clients
router.get("/clients/list", verifyJWT, async (req: any, res) => {
  try {
    const { role } = req.user;
    if (role !== "ADMIN" && role !== "WORKER") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const clients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        profileStatus: true,
      },
    });

    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// get all files for a specific client
router.get("/files/client/:clientId", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const tasks = await prisma.task.findMany({
      where: { clientId },
      include: {
        files: {
          include: {
            task: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    const allFiles = tasks.flatMap(task => 
      task.files.map(file => ({
        ...file,
        task: {
          id: task.id,
          title: task.title
        }
      }))
    );

    res.json(allFiles);
  } catch (error) {
    console.error("Error fetching client files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// get all profile files for the client
router.get("/profile-files/client/:clientId", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const profileFilesDir = path.join(__dirname, `../../uploads/profile-files/${clientId}`);
    
    if (!fs.existsSync(profileFilesDir)) {
      return res.json([]);
    }

    const fileNames = fs.readdirSync(profileFilesDir);
    
    const files = fileNames.map(fileName => {
      const filePath = path.join(profileFilesDir, fileName);
      const stats = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      let fileType = 'application/octet-stream';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        fileType = `image/${ext.slice(1)}`;
      } else if (ext === '.pdf') {
        fileType = 'application/pdf';
      } else if (['.doc', '.docx'].includes(ext)) {
        fileType = 'application/msword';
      }
      
      return {
        id: `profile-${fileName}`,
        fileName: fileName,
        fileUrl: `uploads/profile-files/${clientId}/${fileName}`,
        fileType: fileType,
        uploadedAt: stats.birthtime,
        caption: null,
        section: 'Profile',
        isCompleted: true,
        task: {
          id: 0,
          title: 'Profile Setup'
        }
      };
    });

    res.json(files);
  } catch (error) {
    console.error("Error fetching profile files:", error);
    res.status(500).json({ error: "Failed to fetch profile files" });
  }
});

export default router;