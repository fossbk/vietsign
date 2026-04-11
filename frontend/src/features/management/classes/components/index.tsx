"use client";

import {
  BookOpenCheck,
  Search,
  Plus,
  Users,
  Calendar,
  Clock,
  User,
  ChevronRight,
  Filter,
  Building,
  Edit,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/core/store";
import { statusConfig, ClassItem } from "@/data";
import { fetchAllClasses, createClass } from "@/services/classService";
import {
  fetchUsersByRole,
  fetchUsersByFacility,
  fetchAllUsers,
} from "@/services/userService";
import {
  fetchAllOrganizations,
  OrganizationItem,
} from "@/services/organizationService";
import { OrganizationManagerModel } from "@/domain/entities/Organization";
import {
  Pagination,
  usePagination,
} from "@/shared/components/common/Pagination";
import { Modal } from "@/shared/components/common/Modal";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import { removeVietnameseTones } from "@/shared/utils/text";

const ITEMS_PER_PAGE = 6;

export function ClassesManagement() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lấy thông tin user từ Redux store
  const { user } = useSelector((state: RootState) => state.admin);

  // State quản lý dữ liệu
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State quản lý giáo viên & cơ sở
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersMap, setTeachersMap] = useState<Record<number, string>>({});

  const [facilities, setFacilities] = useState<OrganizationItem[]>([]);
  const [facilitiesMap, setFacilitiesMap] = useState<Record<number, string>>(
    {},
  );

  const [isUploading, setIsUploading] = useState(false);

  // State for new class form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    classLevel: "1",
    teacherId: "",
    organizationId: "",
    thumbnail: "/images/class-default.jpg",
  });

  // Teachers for selected organization in form
  const [formTeachers, setFormTeachers] = useState<any[]>([]);
  const [loadingFormTeachers, setLoadingFormTeachers] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);

  // Filtered teachers based on search
  const filteredFormTeachers = formTeachers.filter((t) =>
    t.name?.toLowerCase().includes(teacherSearch.toLowerCase()),
  );

  // Determine if current user is a teacher
  const isUserTeacher =
    user?.role === "TEACHER" ||
    user?.role?.role === "TEACHER" ||
    user?.code === "TEACHER";

  // Auto-fill organization for teachers
  useEffect(() => {
    const fetchTeacherOrg = async () => {
      if (isUserTeacher && user) {
        let orgId = user.organizationId || (user as any).organization_id;

        // If organizationId is missing in profile, fetch from API
        if (!orgId) {
          const userId = user.id || (user as any).user_id;
          if (userId) {
            try {
              const res = await OrganizationManagerModel.getByUser(userId);
              // API returns { managers: [...] } or direct array
              const list =
                res.managers || res.data || (Array.isArray(res) ? res : []);
              if (list.length > 0) {
                // Use the first organization found (usually teachers belong to one school)
                orgId = list[0].organization_id;
              }
            } catch (e) {
              console.error("Failed to fetch teacher organization:", e);
            }
          }
        }

        if (orgId) {
          setFormData((prev) => ({
            ...prev,
            organizationId: String(orgId),
            // Also set teacherId to themselves
            teacherId: String(user.id || (user as any).user_id || ""),
          }));
        }
      }
    };

    if (isModalOpen) {
      fetchTeacherOrg();
    }
  }, [user, isUserTeacher, isModalOpen]);

  // Load teachers when organization is selected
  const handleOrganizationChange = async (orgId: string) => {
    setFormData({ ...formData, organizationId: orgId, teacherId: "" });
    setTeacherSearch(""); // Reset teacher search
    setFormTeachers([]); // Clear existing teachers

    if (orgId) {
      setLoadingFormTeachers(true);
      try {
        // Fetch teachers for the selected organization from organization_manager table
        const result = await OrganizationManagerModel.getByOrganization(
          orgId,
          "TEACHER",
        );
        setFormTeachers(result.users || []);
      } catch (error) {
        console.error("Error loading teachers for organization:", error);
        setFormTeachers([]);
      } finally {
        setLoadingFormTeachers(false);
      }
    }
  };

  // Select a teacher from suggestions
  const handleSelectTeacher = (teacher: any) => {
    setFormData({ ...formData, teacherId: String(teacher.id) });
    setTeacherSearch(teacher.name);
    setShowTeacherSuggestions(false);
  };
  // ... existing loadData useEffect ...

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // First load facilities to determine allowed organizationIds for filtering
        const facilitiesRes = await fetchAllOrganizations().catch(() => []);
        setFacilities(facilitiesRes);

        // Build class query params based on role
        // Build class query params based on role
        const rawUserCode = user?.code || "";
        const facilityManagerRoles = [
          "FacilityManager",
          "FACILITY_MANAGER",
          "CENTER_ADMIN",
          "SCHOOL_ADMIN",
        ];

        const userRole = facilityManagerRoles.includes(rawUserCode)
          ? rawUserCode
          : user?.role?.role || user?.code;

        const isAdmin = ["Admin", "ADMIN", "SUPER_ADMIN", "TEST"].includes(
          userRole,
        );
        const isFacilityManager = [
          "FacilityManager",
          "FACILITY_MANAGER",
          "CENTER_ADMIN",
          "SCHOOL_ADMIN",
        ].includes(userRole);
        const isTeacher = userRole === "Teacher" || userRole === "TEACHER";
        const userOrgId =
          user?.organizationId || (user as any)?.organization_id;
        const userId = user?.id || (user as any)?.user_id;

        let classesQuery: any = {};

        // TEACHER: filter by teacherId (server-side)
        if (isTeacher && userId) {
          classesQuery.teacherId = userId;
        }
        // FACILITY_MANAGER: filter by organizationIds (server-side)
        else if (isFacilityManager && userOrgId) {
          const userOrg = facilitiesRes.find((f: any) => f.id === userOrgId);
          if (userOrg) {
            let allowedSchoolIds: number[] = [];

            if (userOrg.type === "PROVINCE") {
              const childDeptIds = facilitiesRes
                .filter(
                  (f: any) =>
                    f.type === "DEPARTMENT" && f.parentId === userOrgId,
                )
                .map((f: any) => f.id);
              allowedSchoolIds = facilitiesRes
                .filter(
                  (f: any) =>
                    f.type === "SCHOOL" &&
                    f.parentId !== null &&
                    childDeptIds.includes(f.parentId),
                )
                .map((f: any) => f.id);
            } else if (userOrg.type === "DEPARTMENT") {
              allowedSchoolIds = facilitiesRes
                .filter(
                  (f: any) => f.type === "SCHOOL" && f.parentId === userOrgId,
                )
                .map((f: any) => f.id);
            } else if (userOrg.type === "SCHOOL") {
              allowedSchoolIds = [userOrgId];
            }

            if (allowedSchoolIds.length > 0) {
              classesQuery.organizationIds = allowedSchoolIds.join(",");
            }
          }
        }
        // ADMIN: no filter needed, fetch all

        // Load classes with query params and teachers in parallel
        const [classesRes, teachersRes] = await Promise.allSettled([
          fetchAllClasses(classesQuery),
          fetchUsersByRole("TEACHER"),
        ]);

        if (classesRes.status === "fulfilled") {
          // Remove duplicates based on ID to fix React key warning
          const uniqueClasses = classesRes.value.filter(
            (c: any, index: number, self: any[]) =>
              index === self.findIndex((t: any) => t.id === c.id),
          );
          setClasses(uniqueClasses);
        } else {
          console.error("Failed to fetch classes:", classesRes.reason);
        }

        if (teachersRes.status === "fulfilled") {
          setTeachers(teachersRes.value);
        } else {
          console.error("Failed to fetch teachers:", teachersRes.reason);
        }

        // Create map for quick lookup
        const tMap: Record<number, string> = {};
        const safeTeachers =
          teachersRes.status === "fulfilled" ? teachersRes.value : [];
        safeTeachers.forEach((t: any) => {
          tMap[t.id] = t.name;
        });
        setTeachersMap(tMap);

        const fMap: Record<number, string> = {};
        facilitiesRes.forEach((f: any) => {
          fMap[f.id] = f.name;
        });
        setFacilitiesMap(fMap);
      } catch (error) {
        console.error("Failed to load data", error);
        setClasses([]); // Empty on error, NO MOCK
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  // State cho modal xác nhận xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);

  // Helper functions để lấy tên từ ID
  const getTeacherName = (teacherId: number | null | undefined): string => {
    if (!teacherId) return "Chưa phân công";
    return teachersMap[teacherId] || `GV ID: ${teacherId}`;
  };

  const getFacilityName = (organizationId: number | null): string => {
    if (organizationId === null) return "Online";
    return facilitiesMap[organizationId] || "Không xác định";
  };

  // Lọc classes theo role của user
  // NOTE: Dữ liệu đã được lọc server-side dựa trên query params (teacherId, organizationIds)
  // Hàm này giữ lại để backward compatibility và fallback nếu server chưa hỗ trợ
  const getClassesByRole = (): ClassItem[] => {
    // Dữ liệu đã được lọc từ server, trả về trực tiếp
    return classes;
  };

  // Áp dụng lọc theo role trước, sau đó lọc theo search và status
  const roleFilteredClasses = getClassesByRole();

  const filteredClasses = roleFilteredClasses.filter((cls) => {
    const teacherName = getTeacherName(cls.teacherId);
    const facilityName = getFacilityName(cls.organizationId);
    const normalizedQuery = removeVietnameseTones(searchQuery);
    const matchesSearch =
      removeVietnameseTones(cls.name).includes(normalizedQuery) ||
      removeVietnameseTones(teacherName).includes(normalizedQuery) ||
      removeVietnameseTones(facilityName).includes(normalizedQuery);
    const matchesStatus = filterStatus === "all" || cls.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems,
    paddedItems,
    setCurrentPage,
  } = usePagination(filteredClasses, ITEMS_PER_PAGE);

  // Mở trang chi tiết
  const openDetailPage = (cls: ClassItem) => {
    router.push(`/classes-management/${cls.id}`);
  };

  // Mở trang chi tiết ở chế độ sửa
  const openEditPage = (cls: ClassItem, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/classes-management/${cls.id}`);
  };

  // Mở modal xác nhận xóa
  const openDeleteModal = (cls: ClassItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
  };

  // Xử lý xóa (Frontend only update for now, ideally call API)
  const handleDelete = async () => {
    if (classToDelete) {
      try {
        setIsLoading(true);
        await import("@/services/classService").then((mod) =>
          mod.deleteClass(classToDelete.id),
        );
        // Refresh list
        setClasses((prev) => prev.filter((c) => c.id !== classToDelete.id));
        alert("Xóa lớp học thành công");
      } catch (error) {
        console.error("Failed to delete class:", error);
        alert("Đã xảy ra lỗi khi xóa lớp học");
      } finally {
        setIsLoading(false);
        setIsDeleteModalOpen(false);
        setClassToDelete(null);
      }
    }
  };

  // Helper để tạo mô tả theo role
  const getRoleDescription = (): string => {
    // Prioritize code logic same as loadData
    const rawUserCode = user?.code || "";
    const facilityManagerRoles = [
      "FacilityManager",
      "FACILITY_MANAGER",
      "CENTER_ADMIN",
      "SCHOOL_ADMIN",
    ];

    const userRole = facilityManagerRoles.includes(rawUserCode)
      ? rawUserCode
      : user?.role?.role || user?.code;

    const isAdmin = ["Admin", "ADMIN", "SUPER_ADMIN", "TEST"].includes(
      userRole,
    );

    if (isAdmin) {
      return `Quản lý tất cả lớp học trong hệ thống (${roleFilteredClasses.length} lớp)`;
    }

    if (
      [
        "FacilityManager",
        "FACILITY_MANAGER",
        "CENTER_ADMIN",
        "SCHOOL_ADMIN",
      ].includes(userRole)
    ) {
      const userOrgId = user?.organizationId || user?.organization_id;
      const userOrg = facilities.find((f) => f.id === userOrgId);

      if (userOrg?.type === "PROVINCE") {
        return `Quản lý các lớp học trong tất cả trường thuộc ${userOrg.name} (${roleFilteredClasses.length} lớp)`;
      }

      if (userOrg?.type === "DEPARTMENT") {
        return `Quản lý các lớp học trong các trường thuộc ${userOrg.name} (${roleFilteredClasses.length} lớp)`;
      }

      if (userOrg?.type === "SCHOOL") {
        return `Quản lý các lớp học tại ${userOrg.name} (${roleFilteredClasses.length} lớp)`;
      }

      if (userOrg) {
        return `Quản lý các lớp học tại ${userOrg.name} (${roleFilteredClasses.length} lớp)`;
      }
    }

    if (userRole === "Teacher" || userRole === "TEACHER") {
      return `Các lớp học bạn phụ trách (${roleFilteredClasses.length} lớp)`;
    }

    return `Quản lý các lớp học (${roleFilteredClasses.length} lớp)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpenCheck className="w-8 h-8 text-primary-600" />
            Quản lý lớp học
          </h1>
          <p className="text-gray-600 mt-1">{getRoleDescription()}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={20} /> Tạo lớp học mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học, giáo viên hoặc cơ sở..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[25%]">
                  Lớp học
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                  Giáo viên
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                  Cơ sở
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[10%]">
                  Học sinh
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[10%]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : (
                paginatedItems.map((cls) => {
                  const teacherName = getTeacherName(cls.teacherId);
                  const facilityName = getFacilityName(cls.organizationId);
                  const statusInfo = statusConfig[cls.status] || {
                    label: "Khác",
                    color: "bg-gray-100 text-gray-800",
                  };

                  return (
                    <tr
                      key={cls.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetailPage(cls)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden border border-gray-100">
                            {cls.thumbnail &&
                            cls.thumbnail !== "/images/class-default.jpg" ? (
                              <img
                                src={
                                  cls.thumbnail.startsWith("http") ||
                                  cls.thumbnail.startsWith("/")
                                    ? cls.thumbnail
                                    : `${process.env.NEXT_PUBLIC_API_URL}${cls.thumbnail}`
                                }
                                alt={cls.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              cls.name.split(" ").pop()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium text-gray-900 truncate"
                              title={cls.name}
                            >
                              {cls.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              #{cls.code || cls.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User size={14} className="text-gray-400" />
                          <span className="truncate">{teacherName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building size={14} className="text-gray-400" />
                          <span className="truncate">{facilityName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users size={14} className="text-gray-400" />
                          <span>{cls.students || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            onClick={(e) => openEditPage(cls, e)}
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={(e) => openDeleteModal(cls, e)}
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredClasses.length === 0 && !isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpenCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Không tìm thấy lớp học
          </h3>
          <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
        </div>
      ) : !isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={classes.length}
            filteredItems={filteredClasses.length}
            itemName="lớp học"
            onPageChange={setCurrentPage}
          />
        </div>
      ) : null}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo lớp học mới"
      >
        <form
          className="space-y-4 overflow-visible"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setIsLoading(true);

              // Validation
              if (!formData.name?.trim()) {
                alert("Vui lòng nhập tên lớp học");
                setIsLoading(false);
                return;
              }
              if (!formData.organizationId) {
                alert("Vui lòng chọn cơ sở đào tạo");
                setIsLoading(false);
                return;
              }

              // If user is TEACHER, auto-assign teacherId to self
              const isTeacher =
                user?.role === "TEACHER" ||
                user?.role?.role === "TEACHER" ||
                user?.code === "TEACHER";
              const teacherIdToSubmit = isTeacher
                ? user?.id || (user as any)?.user_id
                : Number(formData.teacherId);

              const payload = {
                ...formData,
                teacherId: teacherIdToSubmit,
                organizationId: Number(formData.organizationId),
                status: "ongoing", // Default status
              };

              await createClass(payload);
              // Refresh data
              const [classesRes] = await Promise.allSettled([
                fetchAllClasses(),
              ]);
              if (classesRes.status === "fulfilled") {
                setClasses(classesRes.value);
              }
              setIsModalOpen(false);
              // Reset form
              setFormData({
                name: "",
                description: "",
                code: "",
                classLevel: "1",
                teacherId: "",
                organizationId: "",
                thumbnail: "/images/class-default.jpg",
              });
              alert("Tạo lớp học thành công!");
            } catch (error) {
              console.error(error);
              alert("Lỗi khi tạo lớp học");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Upload Section */}
            <div className="md:col-span-2 flex flex-col items-center justify-center mb-4">
              <div
                className="relative w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary-500 transition-colors cursor-pointer group"
                onClick={() =>
                  document.getElementById("class-image-upload")?.click()
                }
              >
                {formData.thumbnail &&
                formData.thumbnail !== "/images/class-default.jpg" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        formData.thumbnail.startsWith("http") ||
                        formData.thumbnail.startsWith("/")
                          ? formData.thumbnail
                          : `${process.env.NEXT_PUBLIC_API_URL}${formData.thumbnail}`
                      }
                      alt="Class Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center gap-2">
                        <Edit size={20} /> Thay đổi ảnh
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 group-hover:text-primary-600 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-50">
                      {isUploading ? (
                        <Clock className="animate-spin text-primary-600" />
                      ) : (
                        <Users className="text-gray-400 group-hover:text-primary-600" />
                      )}
                    </div>
                    <p className="font-medium">Tải ảnh bìa lớp học</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Nhấp để chọn ảnh (JPG, PNG)
                    </p>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center text-primary-600">
                      <Clock className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm font-medium">
                        Đang tải ảnh...
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <input
                id="class-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    try {
                      setIsUploading(true);
                      const { uploadFile } =
                        await import("@/services/uploadService");
                      const path = await uploadFile(e.target.files[0]);
                      // Normalize path: if backend returns relative path, ensure it's usable
                      // Backend returns /uploads/filename.ext
                      // If we use NEXT_PUBLIC_API_URL, we should store it as is or full URL?
                      // Storing relative is better if API_URL changes.
                      setFormData({ ...formData, thumbnail: path });
                    } catch (err) {
                      console.error("Upload failed", err);
                      alert("Tải ảnh thất bại");
                    } finally {
                      setIsUploading(false);
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Tên lớp học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Lớp 10A1"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Mã lớp học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: CLASS001"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Khối lớp <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.classLevel}
                onChange={(e) =>
                  setFormData({ ...formData, classLevel: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={String(level)}>
                    Lớp {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Cơ sở đào tạo - đưa lên trước */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Cơ sở đào tạo <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
                value={formData.organizationId}
                disabled={isUserTeacher && !!formData.organizationId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
              >
                <option value="">Chọn cơ sở (Trường)</option>
                {facilities
                  .filter((facility) => {
                    if (facility.type !== "SCHOOL") return false;
                    if (isUserTeacher) {
                      // Prioritize formData since we auto-filled it from API if needed
                      const targetOrgId =
                        formData.organizationId ||
                        user?.organizationId ||
                        (user as any)?.organization_id;

                      return targetOrgId
                        ? Number(facility.id) === Number(targetOrgId)
                        : false;
                    }
                    return true;
                  })
                  .map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Chỉ hiện dropdown chọn giáo viên nếu không phải là giáo viên */}
            {user?.role !== "TEACHER" &&
            user?.role?.role !== "TEACHER" &&
            user?.code !== "TEACHER" ? (
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-gray-700">
                  Giáo viên phụ trách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    !formData.organizationId
                      ? "Vui lòng chọn cơ sở trước"
                      : loadingFormTeachers
                        ? "Đang tải..."
                        : "Nhập tên giáo viên để tìm..."
                  }
                  value={teacherSearch}
                  onChange={(e) => {
                    setTeacherSearch(e.target.value);
                    setShowTeacherSuggestions(true);
                    // Clear selected teacher if typing new search
                    if (formData.teacherId) {
                      setFormData({ ...formData, teacherId: "" });
                    }
                  }}
                  onFocus={() => setShowTeacherSuggestions(true)}
                  onBlur={() => {
                    // Delay hiding to allow click on suggestion
                    setTimeout(() => setShowTeacherSuggestions(false), 200);
                  }}
                  disabled={!formData.organizationId || loadingFormTeachers}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {/* Hidden input for form validation */}
                <input type="hidden" value={formData.teacherId} required />

                {/* Suggestions dropdown */}
                {showTeacherSuggestions &&
                  formData.organizationId &&
                  filteredFormTeachers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredFormTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
                          onClick={() => handleSelectTeacher(teacher)}
                          className="px-4 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{teacher.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Selected teacher indicator */}
                {formData.teacherId && (
                  <p className="text-xs text-green-600">
                    ✓ Đã chọn:{" "}
                    {
                      formTeachers.find(
                        (t) => String(t.id) === formData.teacherId,
                      )?.name
                    }
                  </p>
                )}

                {/* No teachers warning */}
                {formData.organizationId &&
                  formTeachers.length === 0 &&
                  !loadingFormTeachers && (
                    <p className="text-xs text-amber-600">
                      Cơ sở này chưa có giáo viên nào
                    </p>
                  )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Giáo viên phụ trách
                </label>
                <input
                  type="text"
                  value={user?.name || "Bạn"}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  Bạn sẽ là giáo viên phụ trách lớp này
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
            >
              Tạo lớp học
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa lớp học "${classToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
