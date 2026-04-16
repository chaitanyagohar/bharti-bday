import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        // Use your actual Gmail and the 16-digit App Password
        user: 'solidate03@gmail.com', 
        pass: 'lahzrsxoktsbaftx', 
      },
    });

    await transporter.sendMail({
      from: '"Birthday Bot" solidate03@gmail.com',
      to: "chaitanyagohar@gmail.com",
      subject: "STORY APPROVED! ✅",
      text: "Bharti just clicked APPROVE on the Instagram story permission page!",
    });

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ message: 'Error sending email' }, { status: 500 });
  }
}