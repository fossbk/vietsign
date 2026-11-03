import { Base } from "@/domain/entities/base";
import { mockSubmissions, SubmissionItem } from "@/data";

class SubmissionModelClass extends Base {
  
  constructor() {
    super("practical-submissions"); // Sửa lại tên resource cho đúng với đường dẫn API
  }

  // Viết hàm gọi API thật
  getAllSubmissions = async (): Promise<any> => {
    const response = await this.apiGet();
    return response;
  };
}

const SubmissionModel = new SubmissionModelClass();

export async function fetchAllSubmissions(): Promise<SubmissionItem[]> {
  try {
    // Gọi API thật
    const response = await SubmissionModel.getAllSubmissions();
    
    const dataList = response?.data?.data || [];

    const formattedData: SubmissionItem[] = dataList.map((item: any) => ({
      id: item.attempt_id,             // Giao diện dùng id, API trả attempt_id
      studentId: item.studentId,       
      examId: item.exam_id,            
      classId: item.class_id || 1,     // Thêm fallback nếu API thiếu
      status: item.status || "pending", 
      submittedAt: item.submittedAt || "Chưa cập nhật",
      score: item.score || null,
    }));

    return formattedData;
  } catch (error) {
    console.error("Lỗi khi fetch dữ liệu bài nộp:", error);
    return mockSubmissions; 
  }
}