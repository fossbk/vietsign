"use client";

import React, { useEffect } from "react";
import {ScoreList} from "@/features/grading";
import { DashboardLayout } from "@/shared/components/layout";
import Link from 'next/link';

export default function GradingPage() {
  useEffect(() => { document.title = "Chấm điểm - VietSignSchool"; }, []);

  return (
    <DashboardLayout>
      <Link href="/grading/curriculum" className="m-4 inline-block rounded-xl border border-primary-300 bg-primary-50 px-4 py-3 font-bold">Nhận xét thực hành ký hiệu theo lớp</Link>
      <ScoreList />
    </DashboardLayout>
  );
}
