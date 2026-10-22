"use client";
import React from "react";
import { Header } from "../layout/header";
import { Footer } from "../layout/footer";

interface DefaultLayoutProps {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header />
      <main className="flex-grow flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
