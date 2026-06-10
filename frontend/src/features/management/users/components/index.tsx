"use client";

import {
  Users,
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizations } from "@/shared/hooks/useOrganizations";
import {
  UserItem,
  fetchAllUsers,
  createUser,
  deleteUser,
  roleLabels,
  roleColors,
} from "@/services/userService";
import {
  Pagination,
  usePagination,
} from "@/shared/components/common/Pagination";
import { Modal } from "@/shared/components/common/Modal";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";

import { removeVietnameseTones } from "@/shared/utils/text";

const ITEMS_PER_PAGE = 10;

export function UsersManagement() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "USER",
    organizationId: "",
    grade: "",
  });

  // State xử lý autocomplete Organization (Sở & Trường)
  const { data: allOrganizations = [] } = useOrganizations();

  const [deptInput, setDeptInput] = useState("");
  const [schoolInput, setSchoolInput] = useState("");

  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [orgError, setOrgError] = useState("");

  // Derived lists
  const departments = allOrganizations.filter((o) => o.type === "DEPARTMENT");
  const schools = allOrganizations.filter((o) => o.type === "SCHOOL");

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(deptInput.toLowerCase()),
  );

  const filteredSchools = schools.filter((s) => {
    const matchName = s.name.toLowerCase().includes(schoolInput.toLowerCase());
    const matchDept = selectedDeptId
      ? Number(s.parentId) === Number(selectedDeptId)
      : true;
    return matchName && matchDept;
  });

  // State để quản lý dữ liệu
  const [allUsers, setAllUsers] = useState<UserItem[]>([]); // Store all users for client-side pagination
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // State cho modal xác nhận xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users logic
  // Fetch users logic
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch ALL users (large limit) to handle pagination on client side
      // This bypasses the backend pagination count bug
      const response = await fetchAllUsers({
        page: 1,
        limit: 10000,
        search: debouncedSearch,
        role: filterRole !== "all" ? filterRole : undefined,
      });

      const fetchedUsers = response.users;
      setAllUsers(fetchedUsers);
      setTotalItems(fetchedUsers.length);
      setTotalPages(Math.ceil(fetchedUsers.length / ITEMS_PER_PAGE) || 1);

      // Update displayed users immediately for current page
      // (Effect below handles it too, but we ensure consistency)
      // const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      // const endIndex = startIndex + ITEMS_PER_PAGE;
      // setUsers(fetchedUsers.slice(startIndex, endIndex));
    } catch (error) {
      console.error("Failed to load users", error);
      setAllUsers([]);
      setUsers([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when filters change (not on currentPage change)
  useEffect(() => {
    loadUsers();
  }, [debouncedSearch, filterRole]);

  // Client-side pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setUsers(allUsers.slice(startIndex, endIndex));
  }, [currentPage, allUsers]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterRole]);

  // Mở trang chi tiết
  const openDetailPage = (user: UserItem) => {
    router.push(`/users/${user.id}`);
  };

  // Mở trang chi tiết ở chế độ sửa
  const openEditPage = (user: UserItem, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/users/${user.id}`);
  };

  // Mở modal xác nhận xóa
  const openDeleteModal = (user: UserItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Xử lý xóa
  const handleDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id);
        await loadUsers(); // Reload list
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error("Failed to delete user", error);
        // Handle error (e.g. show toast)
      }
    }
  };

  // Xử lý tạo mới
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError("");

    // Validate logic
    const requiresOrg = [
      "TEACHER",
      "STUDENT",
      "FACILITY_MANAGER",
      "CENTER_ADMIN",
      "SCHOOL_ADMIN",
    ].includes(formData.role);

    // Nếu nhập text mà chưa chọn ID -> Báo lỗi (User experience)
    // Nhưng user yêu cầu: "nếu không chọn sở mà nhập luôn trường -> list all".
    // "có thể thêm sau" -> cho phép để trống.

    // Logic: Nếu đã nhập tên trường mà chưa có ID => Cảnh báo (vì text ko match ID nào)
    // Trừ khi text rỗng.
    if (schoolInput && !formData.organizationId) {
      setOrgError(
        "Vui lòng chọn trường học từ danh sách (hoặc để trống nếu chưa xác định).",
      );
      return;
    }

    try {
      await createUser({
        ...formData,
        organizationId: formData.organizationId
          ? Number(formData.organizationId)
          : null,
      });
      // Try to go to first page to see new user or reload current?
      // Usually reload current
      await loadUsers();
      setIsModalOpen(false);
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        role: "USER",
        organizationId: "",
        grade: "",
      });
      // Reset custom inputs
      setDeptInput("");
      setSchoolInput("");
      setSelectedDeptId("");
      setOrgError("");
    } catch (error) {
      console.error("Failed to create user", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-600" />
            Quản lý người dùng
          </h1>
          <p className="text-gray-600 mt-1">
            Quản lý tất cả người dùng trong hệ thống ({totalItems} người dùng)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={20} />
          Thêm người dùng
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
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="CENTER_ADMIN">Quản lý Sở/Trung tâm</option>
              <option value="SCHOOL_ADMIN">Quản lý Trường học</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="STUDENT">Học sinh</option>
              <option value="PARENT">Phu huynh</option>
              <option value="USER">Người dùng</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[35%]">
                  Người dùng
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                  Cơ sở
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[15%]">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[15%]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : (
                users.map((user, index) =>
                  user ? (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/users-management/${user.id}`)
                      }
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 min-w-[40px] rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold overflow-hidden border border-gray-100 shadow-sm">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (user.name || "U").charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium text-gray-900 truncate"
                              title={user.name}
                            >
                              {user.name}
                            </p>
                            <p
                              className="text-sm text-gray-500 truncate"
                              title={user.email}
                            >
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            roleColors[user.role] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.organizationId
                          ? allOrganizations.find(
                              (o) =>
                                String(o.id) === String(user.organizationId),
                            )?.name || `Cơ sở #${user.organizationId}`
                          : "Không thuộc cơ sở nào"}
                      </td>
                      <td className="px-6 py-4">
                        {!user.isDeleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck size={14} />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <UserX size={14} />
                            Không hoạt động
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={(e) => openDeleteModal(user, e)}
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                )
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && users.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={totalItems}
            filteredItems={users.length}
            itemName="người dùng"
            onPageChange={setCurrentPage}
          />
        )}

        {!isLoading && users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Không tìm thấy người dùng
            </h3>
            <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
          </div>
        )}
      </div>

      {/* Modal thêm người dùng mới */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm người dùng mới"
      >
        <form className="flex flex-col h-[550px]" onSubmit={handleCreate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start overflow-y-auto pr-2 pb-32">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                type="text"
                placeholder="Nhập họ và tên"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="email@vietsign.edu.vn"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Số điện thoại
              </label>
              <input
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                type="tel"
                placeholder="Nhập số điện thoại"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
              >
                {Object.entries(roleLabels)
                  .filter(([key]) => key !== "ADMIN" && key !== "SUPER_ADMIN")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            {formData.role === "STUDENT" && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Khoi lop <span className="text-red-500">*</span>
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                  required
                >
                  <option value="">Chon khoi lop</option>
                  {[1, 2, 3, 4, 5].map((grade) => (
                    <option key={grade} value={grade}>
                      Khoi {grade}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Container có margin bottom lớn khi mở dropdown để không bị che */}
            {/* Logic hiển thị Organization Input dựa trên Role */}
            {formData.role !== "ADMIN" && formData.role !== "USER" && (
              <>
                {/* Chọn Sở Giáo Dục */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-gray-700">
                    Sở Giáo dục (Cấp Tỉnh/Thành phố)
                  </label>
                  <input
                    type="text"
                    value={deptInput}
                    onChange={(e) => {
                      setDeptInput(e.target.value);
                      setSelectedDeptId(""); // Reset Dept selection forces re-filter schools
                      setShowDeptSuggestions(true);
                      setOrgError("");
                    }}
                    onFocus={() => setShowDeptSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowDeptSuggestions(false), 200)
                    }
                    placeholder="Nhập và chọn Sở Giáo dục..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />

                  {showDeptSuggestions && (
                    <div className="absolute z-50 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredDepts.length > 0 ? (
                        filteredDepts.map((dept) => (
                          <div
                            key={dept.id}
                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-none"
                            onClick={() => {
                              setSelectedDeptId(String(dept.id));
                              setDeptInput(dept.name);
                              // Reset school selection to prevent mismatch
                              setSchoolInput("");
                              setFormData((prev) => ({
                                ...prev,
                                organizationId: "",
                              }));
                              setShowDeptSuggestions(false);
                              setOrgError("");
                            }}
                          >
                            {dept.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          Không tìm thấy Sở phù hợp
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chọn Trường học */}
                <div
                  className={`space-y-1.5 relative ${showSchoolSuggestions ? "mb-48" : ""}`}
                >
                  <label className="text-sm font-semibold text-gray-700">
                    {[
                      "FACILITY_MANAGER",
                      "CENTER_ADMIN",
                      "SCHOOL_ADMIN",
                    ].includes(formData.role)
                      ? "Cơ sở vật chất (Trường/Trung tâm)"
                      : "Trường học"}
                  </label>
                  <input
                    type="text"
                    value={schoolInput}
                    onChange={(e) => {
                      setSchoolInput(e.target.value);
                      setFormData((prev) => ({ ...prev, organizationId: "" }));
                      setShowSchoolSuggestions(true);
                      setOrgError("");
                    }}
                    onFocus={() => setShowSchoolSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSchoolSuggestions(false), 200)
                    }
                    placeholder={
                      selectedDeptId
                        ? "Chọn trường thuộc Sở..."
                        : "Nhập tên trường (tìm tất cả)..."
                    }
                    className={`w-full px-4 py-2.5 border ${
                      orgError ? "border-red-500" : "border-gray-200"
                    } rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                  />
                  {orgError && (
                    <p className="text-xs text-red-500">{orgError}</p>
                  )}

                  {showSchoolSuggestions && (
                    <div className="absolute z-50 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                          <div
                            key={school.id}
                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-none"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                organizationId: String(school.id),
                              }));
                              setSchoolInput(school.name);
                              setShowSchoolSuggestions(false);
                              setOrgError("");

                              // Auto-fill dept if found
                              if (school.parentId) {
                                const parentDept = departments.find(
                                  (d) =>
                                    String(d.id) === String(school.parentId),
                                );
                                if (parentDept) {
                                  setDeptInput(parentDept.name);
                                  setSelectedDeptId(String(parentDept.id));
                                }
                              }
                            }}
                          >
                            {school.name}
                            {/* Show parent name info if global search */}
                            {!selectedDeptId && school.parentId && (
                              <span className="block text-xs text-gray-400 mt-0.5">
                                {
                                  departments.find(
                                    (d) =>
                                      String(d.id) === String(school.parentId),
                                  )?.name
                                }
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          Không tìm thấy trường phù hợp
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
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
              Thêm
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
        message={`Bạn có chắc chắn muốn xóa người dùng "${userToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
