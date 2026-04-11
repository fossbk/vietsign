"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Users,
  User,
  Calendar,
  Building,
  Loader2,
  GraduationCap,
  School,
  UserCheck,
  UserX,
  Plus,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/core/store";
import { OrganizationItem } from "@/data";
import {
  fetchProvinces,
  fetchProvinceById,
  type Province,
  type Commune,
} from "@/services/vietnamLocationsApi";
import { ConfirmModal } from "@/shared/components/common/ConfirmModal";
import {
  useOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useCreateOrganization,
} from "@/shared/hooks/useOrganizations";
import { message } from "antd";
import { roleLabels, roleColors, UserItem } from "@/services/userService";
import {
  Pagination,
  usePagination,
} from "@/shared/components/common/Pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsersByFacility,
  fetchUsersByRole,
  createUser,
} from "@/services/userService";
import {
  assignOrganizationManager,
  revokeOrganizationManager,
  fetchUserManagedOrganizations,
} from "@/services/organizationService";
import { Modal } from "@/shared/components/common/Modal";
import { useOrganizations } from "@/shared/hooks/useOrganizations";

// --- Sub-component for User Table ---
const UserListTable = ({
  users,
  emptyMessage,
  onRevoke,
}: {
  users: UserItem[];
  emptyMessage: string;
  onRevoke?: (user: UserItem) => void;
}) => {
  const router = useRouter();
  const {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    itemsPerPage,
    totalItems,
  } = usePagination(users || [], 10);

  if (!users || users.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[40%]">
                Người dùng
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                Vai trò
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[20%]">
                Trạng thái
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 w-[20%]">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedItems.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/users-management/${user.id}`)}
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
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/users-management/${user.id}`);
                      }}
                      title="Xem chi tiết"
                    >
                      <Edit size={18} />
                    </button>
                    {onRevoke && (
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevoke(user);
                        }}
                        title="Hủy quyền quản lý"
                      >
                        <UserX size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          filteredItems={totalItems}
          itemName="người dùng"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export function OrganizationDetail() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  // API Hooks
  const { data: organization, isLoading, isError } = useOrganization(id);
  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();
  const createMutation = useCreateOrganization();

  // ===== USER & ROLE-BASED ACCESS CONTROL =====
  const { user } = useSelector((state: RootState) => state.admin);

  // Prioritize code for facility managers if role object is generic "User"
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

  const isAdmin = ["Admin", "ADMIN", "SUPER_ADMIN", "TEST"].includes(userRole);
  const isFacilityManager = facilityManagerRoles.includes(userRole);

  // Get user ID for fetching managed organizations
  const userId = user?.id || (user as any)?.user_id;

  // Fetch organizations that this user manages (from organization_managers table)
  const { data: userManagedOrgIds = [] } = useQuery({
    queryKey: ["user-managed-orgs", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchUserManagedOrganizations(Number(userId));
    },
    enabled: !!userId && isFacilityManager,
  });

  // Fetch all organizations early to determine access
  const { data: allOrgsForAccess = [] } = useOrganizations();

  // Check organization relationship
  // isOwnOrg: the user directly manages this organization
  const isOwnOrg = userManagedOrgIds.includes(id);

  // Check if this org is a child of any organization the user manages
  const isChildOrg = React.useMemo(() => {
    if (!isFacilityManager || userManagedOrgIds.length === 0 || isOwnOrg)
      return false;

    const currentOrg = allOrgsForAccess.find((o) => o.id === id);
    if (!currentOrg) return false;

    // Check if parent is one of user's managed orgs
    if (currentOrg.parentId && userManagedOrgIds.includes(currentOrg.parentId))
      return true;

    // Check grandchild (two levels down: Bộ -> Sở -> Trường)
    const parentOrg = allOrgsForAccess.find(
      (o) => o.id === currentOrg.parentId,
    );
    if (
      parentOrg &&
      parentOrg.parentId &&
      userManagedOrgIds.includes(parentOrg.parentId)
    )
      return true;

    return false;
  }, [isFacilityManager, userManagedOrgIds, isOwnOrg, id, allOrgsForAccess]);

  // Check if facility manager has access to this organization (view or manage)
  const hasAccessToOrg = React.useMemo(() => {
    if (isAdmin) return true;
    if (!isFacilityManager) return false;
    return isOwnOrg || isChildOrg;
  }, [isAdmin, isFacilityManager, isOwnOrg, isChildOrg]);

  // ===== GRANULAR PERMISSIONS =====
  // CENTER_ADMIN:
  // - At own org (Sở): Can VIEW managers only, can add schools (children)
  // - At child org (Trường): Full management (add/edit/delete org, managers, teachers, students)

  // Can edit the organization's info itself
  // CENTER_ADMIN can edit their own org AND child orgs
  const canEditOrg = isAdmin || (isFacilityManager && hasAccessToOrg);

  // Can delete the organization
  const canDeleteOrg = isAdmin || (isFacilityManager && isChildOrg);

  // Can add child organizations (e.g., add Trường under Sở)
  const canAddChildren = isAdmin || (isFacilityManager && hasAccessToOrg);

  // Can manage managers (add/edit/revoke)
  // At own org: VIEW ONLY, at child org: FULL
  const canManageManagers = isAdmin || (isFacilityManager && isChildOrg);

  // Can manage teachers and students
  const canManageStaff = isAdmin || (isFacilityManager && isChildOrg);

  // Legacy aliases for backward compatibility
  const canEdit = canEditOrg;
  const canDelete = canDeleteOrg;

  // Fetch users separately - with error handling
  const { data: facilityUsers = [], isError: usersError } = useQuery({
    queryKey: ["users", "facility", id],
    queryFn: async () => {
      try {
        return await fetchUsersByFacility(id);
      } catch (e) {
        console.error("Failed to fetch facility users:", e);
        return [];
      }
    },
    enabled: !!id,
    retry: false, // Don't retry on user API failures
  });

  const managers = (facilityUsers || []).filter((u) =>
    ["FACILITY_MANAGER", "CENTER_ADMIN", "SCHOOL_ADMIN"].includes(u.role),
  );
  const teachers = (facilityUsers || []).filter((u) => u.role === "TEACHER");
  const students = (facilityUsers || []).filter((u) => u.role === "STUDENT");

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<OrganizationItem>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Add School Modal State
  const [isAddSchoolModalOpen, setIsAddSchoolModalOpen] = useState(false);
  const [addSchoolProvince, setAddSchoolProvince] = useState<number | "">("");
  const [addSchoolWards, setAddSchoolWards] = useState<Commune[]>([]);
  const [loadingAddSchoolWards, setLoadingAddSchoolWards] = useState(false);

  // Add Department Modal State (New)
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] =
    useState(false);
  const [addDepartmentWards, setAddDepartmentWards] = useState<Commune[]>([]);
  const [loadingAddDepartmentWards, setLoadingAddDepartmentWards] =
    useState(false);

  // Manager Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"select" | "create">("select");
  const [selectedAssignUser, setSelectedAssignUser] = useState<string>("");
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Role to assign/create: 'MANAGER' (dynamic based on org type), 'TEACHER', or 'STUDENT'
  const [targetRole, setTargetRole] = useState<
    "MANAGER" | "TEACHER" | "STUDENT"
  >("MANAGER");

  const queryClient = useQueryClient();

  const { data: potentialManagers = [] } = useQuery({
    queryKey: ["users", "potential-managers", organization?.type, targetRole],
    queryFn: async () => {
      // Determine actual role string
      let roleToFetch = "";
      if (targetRole === "MANAGER") {
        roleToFetch =
          organization?.type === "SCHOOL" ? "SCHOOL_ADMIN" : "CENTER_ADMIN";
      } else {
        roleToFetch = targetRole;
      }

      const targetRoleUsers = await fetchUsersByRole(roleToFetch);

      // Filter out users who already manage an organization or belong to one
      return targetRoleUsers.filter((u) => !u.organizationId);
    },
    enabled: isAssignModalOpen && assignMode === "select" && !!organization,
  });

  const assignMutation = useMutation({
    mutationFn: assignOrganizationManager,
    onSuccess: () => {
      message.success("Gán quản lý thành công");
      setIsAssignModalOpen(false);
      setSelectedAssignUser("");
      setNewUserForm({ name: "", email: "", password: "" }); // Reset new user form
      queryClient.invalidateQueries({ queryKey: ["users", "facility", id] });
    },
    onError: (error: any) => {
      message.error(error.message || "Gán quản lý thất bại");
    },
  });

  const createAndAssignMutation = useMutation({
    mutationFn: async (data: typeof newUserForm) => {
      let role = "";
      if (targetRole === "MANAGER") {
        role =
          organization?.type === "SCHOOL" ? "SCHOOL_ADMIN" : "CENTER_ADMIN";
      } else {
        role = targetRole;
      }

      // 1. Create User
      let newUser;
      try {
        newUser = await createUser({
          ...data,
          role: role,
          organizationId: id,
        });
      } catch (error: any) {
        // Enhance error message for user creation failure
        const serverMsg = error?.response?.data?.message || error?.message;
        if (
          serverMsg?.includes("already exists") ||
          serverMsg?.includes("Email")
        ) {
          throw new Error(`Email "${data.email}" đã tồn tại trong hệ thống.`);
        }
        throw new Error(`Lỗi khi tạo người dùng: ${serverMsg}`);
      }

      if (!newUser || (!newUser.user_id && !newUser.id)) {
        throw new Error("Không lấy được thông tin người dùng mới tạo.");
      }

      // Step 2: Assign logic is handled by backend createUser when organizationId is provided.
      // We don't need to call assignOrganizationManager here to avoid duplicate key errors.

      return newUser;
    },
    onSuccess: () => {
      message.success("Tạo và thêm thành công");
      setIsAssignModalOpen(false);
      setNewUserForm({ name: "", email: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["users", "facility", id] });
    },
    onError: (error: any) => {
      message.error(error.message || "Tạo và thêm thất bại");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeOrganizationManager,
    onSuccess: () => {
      message.success("Hủy quyền quản lý thành công");
      queryClient.invalidateQueries({ queryKey: ["users", "facility", id] });
    },
    onError: (error: any) => {
      message.error(error.message || "Hủy quyền thất bại");
    },
  });

  const handleAssignManager = () => {
    if (assignMode === "select") {
      if (!selectedAssignUser) return;

      let role_in_org = "";
      if (targetRole === "MANAGER") {
        role_in_org =
          organization?.type === "SCHOOL" ? "SCHOOL_ADMIN" : "CENTER_ADMIN";
      } else {
        role_in_org = targetRole;
      }

      assignMutation.mutate({
        organization_id: id,
        user_id: Number(selectedAssignUser),
        role_in_org,
        is_primary: targetRole === "MANAGER",
      });
    } else {
      if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
        message.warning("Vui lòng điền đầy đủ thông tin");
        return;
      }
      createAndAssignMutation.mutate(newUserForm);
    }
  };

  const handleRevokeManager = (user: UserItem) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn hủy quyền quản lý của ${user.name}?`,
      )
    ) {
      revokeMutation.mutate({
        organization_id: id,
        user_id: user.id,
      });
    }
  };

  const [provinceName, setProvinceName] = useState<string>("");
  const [wardName, setWardName] = useState<string>("");

  const [activeTab, setActiveTab] = useState<
    "info" | "managers" | "teachers" | "students" | "schools" | "departments"
  >("info");

  // Fetch all organizations to find children/parent
  const { data: allOrgs = [] } = useOrganizations();

  // Child Departments if PROVINCE
  const childDepartments = React.useMemo(() => {
    if (organization?.type !== "PROVINCE" || !Array.isArray(allOrgs)) return [];
    return allOrgs.filter(
      (org: OrganizationItem) =>
        org.type === "DEPARTMENT" && org.parentId === organization.id,
    );
  }, [organization, allOrgs]);

  // Child Schools if DEPARTMENT
  const childSchools = React.useMemo(() => {
    if (organization?.type !== "DEPARTMENT" || !Array.isArray(allOrgs))
      return [];
    return allOrgs.filter(
      (org: OrganizationItem) =>
        org.type === "SCHOOL" && org.parentId === organization.id,
    );
  }, [organization, allOrgs]);

  // Parent Organization (Department or Province)
  const parentOrganization = React.useMemo(() => {
    if (
      (organization?.type === "SCHOOL" ||
        organization?.type === "DEPARTMENT") &&
      organization.parentId &&
      Array.isArray(allOrgs)
    ) {
      return allOrgs.find(
        (org: OrganizationItem) => org.id === organization.parentId,
      );
    }
    return null;
  }, [organization, allOrgs]);

  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [activeWards, setActiveWards] = useState<Commune[]>([]);

  useEffect(() => {
    fetchProvinces().then(setProvincesList).catch(console.error);
  }, []);

  useEffect(() => {
    if (organization) {
      setEditForm({ ...organization });
      loadLocationNames(organization.city, organization.ward);
      document.title = `${organization.name} - Quản lý tổ chức - VietSignSchool`;
    }
  }, [organization]);

  // Load wards when province changes in editForm
  useEffect(() => {
    if (editForm.city && typeof editForm.city === "number") {
      fetchProvinceById(editForm.city).then((p) => {
        if (p && p.communes) setActiveWards(p.communes);
        else setActiveWards([]);
      });
    } else {
      setActiveWards([]);
    }
  }, [editForm.city]);

  const loadLocationNames = async (
    cityCode: number | string,
    wardCode: number | string,
  ) => {
    const cCode = Number(cityCode);
    const wCode = Number(wardCode);

    if (!cCode || isNaN(cCode) || cCode <= 0) return;

    try {
      const provinces = await fetchProvinces();
      const province = provinces.find((p: Province) => p.id === cityCode);
      if (province) {
        setProvinceName(province.name);

        if (!wCode || isNaN(wCode) || wCode <= 0) return;
        const provinceDetail = await fetchProvinceById(cCode);
        if (provinceDetail?.communes) {
          const ward = provinceDetail.communes.find(
            (c: Commune) => Number(c.id) === wCode,
          );
          if (ward) setWardName(ward.name);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load location names for:",
        { cityCode, wardCode },
        error,
      );
    }
  };

  // Load wards when province changes in Add School form
  useEffect(() => {
    if (addSchoolProvince) {
      setLoadingAddSchoolWards(true);
      fetchProvinceById(addSchoolProvince)
        .then((p) => {
          if (p && p.communes) setAddSchoolWards(p.communes);
          else setAddSchoolWards([]);
        })
        .finally(() => setLoadingAddSchoolWards(false));
    } else {
      setAddSchoolWards([]);
    }
  }, [addSchoolProvince]);

  // Load wards for Add Department (uses current Province city code)
  useEffect(() => {
    if (
      isAddDepartmentModalOpen &&
      organization?.type === "PROVINCE" &&
      organization.city &&
      typeof organization.city === "number"
    ) {
      setLoadingAddDepartmentWards(true);
      fetchProvinceById(organization.city)
        .then((p) => {
          if (p && p.communes) setAddDepartmentWards(p.communes);
          else setAddDepartmentWards([]);
        })
        .finally(() => setLoadingAddDepartmentWards(false));
    }
  }, [isAddDepartmentModalOpen, organization]);

  // Handler to create a new School
  const handleCreateSchool = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newSchoolData = {
      name: formData.get("name") as string,
      type: "SCHOOL" as const,
      parentId: id, // This department's ID
      street: formData.get("address") as string,
      city: Number(addSchoolProvince),
      ward: Number(formData.get("ward")),
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
    };

    createMutation.mutate(newSchoolData as any, {
      onSuccess: () => {
        message.success("Thêm trường mới thành công");
        setIsAddSchoolModalOpen(false);
        setAddSchoolProvince("");
        setAddSchoolWards([]);
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
      },
      onError: (error: any) => {
        message.error(error.message || "Thêm trường thất bại");
      },
    });
  };

  // Handler to create a new Department
  const handleCreateDepartment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!organization || organization.type !== "PROVINCE") return;

    const newDeptData = {
      name: formData.get("name") as string,
      type: "DEPARTMENT" as const,
      parentId: id, // This Province's ID
      street: formData.get("address") as string,
      city: organization.city, // Department belongs to same city as province
      ward: Number(formData.get("ward")),
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
    };

    createMutation.mutate(newDeptData as any, {
      onSuccess: () => {
        message.success("Thêm Sở Giáo dục mới thành công");
        setIsAddDepartmentModalOpen(false);
        setAddDepartmentWards([]);
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
      },
      onError: (error: any) => {
        message.error(error.message || "Thêm Sở GD thất bại");
      },
    });
  };

  const handleSave = async () => {
    if (organization && editForm) {
      // 1. Get City Name
      let provinceName = "";
      if (editForm.city) {
        const province = provincesList.find((p) => p.id === editForm.city);
        if (province) provinceName = province.name;
      }

      // 2. Get Ward Name
      let wardName = "";
      if (editForm.ward) {
        // Try to find in currently loaded activeWards
        const ward = activeWards.find((w) => Number(w.id) === editForm.ward);
        if (ward) {
          wardName = ward.name;
        } else if (editForm.city) {
          // Fallback: If for some reason activeWards is empty or doesn't have it, try to fetch
          try {
            const p = await fetchProvinceById(Number(editForm.city));
            const w = p?.communes?.find(
              (c: Commune) => Number(c.id) === editForm.ward,
            );
            if (w) wardName = w.name;
          } catch (error) {
            console.error("Error fetching ward details:", error);
          }
        }
      }

      // 3. Construct Address String: "street, ward, city"
      // User requirements: "street" + ", " + "ward" + ", " + "city"
      const addressParts = [];
      if (editForm.street && editForm.street.trim()) {
        addressParts.push(editForm.street.trim());
      }
      if (wardName) addressParts.push(wardName);
      if (provinceName) addressParts.push(provinceName);

      const fullAddress = addressParts.join(", ");

      const payload = {
        ...editForm,
        address: fullAddress, // Explicitly update address
        street: editForm.street, // Ensure street is saved
        city: editForm.city, // Ensure city is saved
        ward: editForm.ward, // Ensure ward is saved
      };

      updateMutation.mutate(
        { id: organization.id, data: payload },
        {
          onSuccess: () => {
            message.success("Cập nhật thành công");
            setIsEditing(false);
            // The query invalidation in useUpdateOrganization will trigger a refetch,
            // updating the view with the new address.
          },
          onError: (error: any) => {
            message.error(error.message || "Cập nhật thất bại");
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (organization) {
      deleteMutation.mutate(organization.id, {
        onSuccess: () => {
          message.success("Xóa thành công");
          router.push("/organizations-management");
        },
        onError: (error: any) => {
          message.error(error.message || "Xóa thất bại");
        },
      });
    }
  };

  const getFullAddress = () => {
    if (!organization) return "";
    // Prioritize the full address string saved in DB
    if (organization.address && organization.address.trim() !== "") {
      return organization.address;
    }

    // Fallback construction
    const parts = [];
    if (organization.street) parts.push(organization.street);
    if (wardName) parts.push(wardName);
    if (provinceName) parts.push(provinceName);
    return parts.length > 0 ? parts.join(", ") : "Chưa cập nhật địa chỉ";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Handle case where organization is null or undefined after loading
  const currentOrganization = organization;

  if (isError || !currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Không tìm thấy tổ chức
        </h2>
        <button
          onClick={() => router.push("/organizations-management")}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Check access for facility managers - they can only view their org and children
  if (isFacilityManager && !hasAccessToOrg && allOrgsForAccess.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <X size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Không có quyền truy cập
        </h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
          Bạn chỉ có thể xem và quản lý tổ chức được phân công hoặc các tổ chức
          con thuộc quyền quản lý của bạn.
        </p>
        <button
          onClick={() => {
            // Redirect to the first organization they manage, or back to list
            if (userManagedOrgIds.length > 0) {
              router.push(`/organizations-management/${userManagedOrgIds[0]}`);
            } else {
              router.push("/organizations-management");
            }
          }}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Về tổ chức của tôi
        </button>
      </div>
    );
  }

  // Define logic for gradients and labels based on type
  const getBannerGradient = (type: string) => {
    switch (type) {
      case "PROVINCE":
        return "from-purple-600 to-indigo-700"; // Bộ GD&ĐT level (legacy)
      case "DEPARTMENT":
        return "from-indigo-500 to-blue-600"; // Sở GD&ĐT
      default:
        return "from-green-500 to-emerald-600"; // Trường
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "PROVINCE":
        return "Bộ GD&ĐT"; // Legacy support
      case "DEPARTMENT":
        return "Sở GD&ĐT";
      default:
        return "Trường học";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => {
            // Updated Navigation Logic
            if (parentOrganization) {
              router.push(`/organizations-management/${parentOrganization.id}`);
            } else {
              router.push("/organizations-management");
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-xl transition-all font-medium border border-transparent hover:border-gray-200 hover:shadow-sm group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span>
            {parentOrganization
              ? `Quay lại ${parentOrganization.name}`
              : "Quay lại danh sách"}
          </span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner Header */}
        <div
          className={`bg-gradient-to-r ${getBannerGradient(currentOrganization.type)} p-8`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Building size={32} className="text-white" />
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-white/30">
                    {getTypeName(currentOrganization.type)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold">
                  {currentOrganization.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {provinceName && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                      {provinceName}
                    </span>
                  )}
                  {parentOrganization && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20">
                      thuộc {parentOrganization.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-white text-center">
              {currentOrganization.type === "PROVINCE" && (
                <>
                  <div>
                    <p className="text-3xl font-bold">
                      {childDepartments.length}
                    </p>
                    <p className="text-xs text-white/80">Sở GD</p>
                  </div>
                </>
              )}
              {currentOrganization.type === "DEPARTMENT" && (
                <>
                  <div>
                    <p className="text-3xl font-bold">{childSchools.length}</p>
                    <p className="text-xs text-white/80">Trường</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{managers.length}</p>
                    <p className="text-xs text-white/80">Quản lý</p>
                  </div>
                </>
              )}
              {currentOrganization.type === "SCHOOL" && (
                <>
                  <div>
                    <p className="text-3xl font-bold">{students.length}</p>
                    <p className="text-xs text-white/80">Học sinh</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{teachers.length}</p>
                    <p className="text-xs text-white/80">Giáo viên</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8 pt-4 gap-6 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
              activeTab === "info"
                ? "text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Building size={18} />
            Thông tin chung
            {activeTab === "info" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
            )}
          </button>

          {/* Tab Departments - chỉ hiện với PROVINCE */}
          {currentOrganization.type === "PROVINCE" && (
            <button
              onClick={() => setActiveTab("departments")}
              className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
                activeTab === "departments"
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building size={18} />
              Danh sách Sở GD ({childDepartments.length})
              {activeTab === "departments" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
          )}

          {/* Tab Schools - chỉ hiện với DEPARTMENT */}
          {currentOrganization.type === "DEPARTMENT" && (
            <button
              onClick={() => setActiveTab("schools")}
              className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
                activeTab === "schools"
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <School size={18} />
              Danh sách Trường ({childSchools.length})
              {activeTab === "schools" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("managers")}
            className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
              activeTab === "managers"
                ? "text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={18} />
            Quản lý ({managers.length})
            {activeTab === "managers" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
            )}
          </button>

          {/* Tab Giáo viên/Học sinh - chỉ hiện với SCHOOL */}
          {currentOrganization.type === "SCHOOL" && (
            <>
              <button
                onClick={() => setActiveTab("teachers")}
                className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
                  activeTab === "teachers"
                    ? "text-primary-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <School size={18} />
                Giáo viên ({teachers.length})
                {activeTab === "teachers" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${
                  activeTab === "students"
                    ? "text-primary-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <GraduationCap size={18} />
                Học sinh ({students.length})
                {activeTab === "students" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-8 bg-white min-h-[400px]">
          {activeTab === "info" && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Tên tổ chức
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-lg font-medium"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 text-lg font-bold">
                      {currentOrganization.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Địa chỉ chi tiết
                  </label>
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Editing Address Logic - Keep simple or reusing components */}
                      {/* For brevity, keeping it simpler here as in original code */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Tỉnh / Thành phố
                          </label>
                          <select
                            value={editForm.city || ""}
                            onChange={(e) => {
                              setEditForm({
                                ...editForm,
                                city: Number(e.target.value),
                                ward: 0,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Chọn Tỉnh/TP</option>
                            {provincesList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Phường / Xã
                          </label>
                          <select
                            value={editForm.ward || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                ward: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={!editForm.city}
                          >
                            <option value="">Chọn Phường/Xã</option>
                            {activeWards.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Số nhà, đường
                        </label>
                        <input
                          type="text"
                          value={editForm.street || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              street: e.target.value,
                            })
                          }
                          placeholder="Số nhà, tên đường..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                      <MapPin
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                      {getFullAddress()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Số điện thoại
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                      <Phone size={18} className="text-gray-400" />
                      {currentOrganization.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                      <Mail size={18} className="text-gray-400" />
                      {currentOrganization.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Quản lý
                  </label>
                  <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                    <User size={18} className="text-gray-400" />
                    {managers.length > 0
                      ? managers.map((m) => m.name).join(", ")
                      : "Chưa có quản lý"}
                  </p>
                </div>

                {currentOrganization.createdAt && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Ngày tạo
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 flex items-center gap-2">
                      <Calendar size={18} className="text-gray-400" />
                      {currentOrganization.createdAt}
                    </p>
                  </div>
                )}

                {/* Edit Controls */}
                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm({ ...currentOrganization });
                        }}
                        className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
                      >
                        <X size={18} />
                        Hủy
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
                        disabled={updateMutation.isPending}
                      >
                        <Save size={18} />
                        {updateMutation.isPending
                          ? "Đang lưu..."
                          : "Lưu thay đổi"}
                      </button>
                    </>
                  ) : (
                    <>
                      {canEdit && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium flex items-center gap-2"
                        >
                          <Edit size={18} />
                          Chỉnh sửa
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (
                              currentOrganization.type === "PROVINCE" &&
                              childDepartments.length > 0
                            ) {
                              message.warning(
                                `Không thể xóa vì còn ${childDepartments.length} Sở GD trực thuộc. Hãy xóa các Sở trước.`,
                              );
                              return;
                            }
                            if (
                              currentOrganization.type === "DEPARTMENT" &&
                              childSchools.length > 0
                            ) {
                              message.warning(
                                `Không thể xóa vì còn ${childSchools.length} Trường trực thuộc. Hãy xóa các Trường trước.`,
                              );
                              return;
                            }
                            setIsDeleteModalOpen(true);
                          }}
                          className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <Trash2 size={18} />
                          Xóa
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "managers" && (
            <div className="animate-in fade-in duration-300 space-y-4">
              {/* Header with info for view-only mode */}
              {isFacilityManager && isOwnOrg && !canManageManagers && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
                  <span className="font-medium">Lưu ý:</span> Bạn chỉ có thể xem
                  danh sách quản lý của cơ sở này. Liên hệ quản trị viên cấp
                  trên để thêm hoặc thay đổi quản lý.
                </div>
              )}
              {canManageManagers && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setTargetRole("MANAGER");
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    <Plus size={16} /> Thêm quản lý
                  </button>
                </div>
              )}
              <UserListTable
                users={managers}
                emptyMessage="Chưa có quản lý nào được gán cho cơ sở này"
                onRevoke={canManageManagers ? handleRevokeManager : undefined}
              />
            </div>
          )}

          {/* Departments Tab - Danh sách Sở thuộc Tỉnh */}
          {activeTab === "departments" &&
            currentOrganization.type === "PROVINCE" && (
              <div className="animate-in fade-in duration-300">
                {canAddChildren && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setIsAddDepartmentModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition"
                    >
                      <Plus size={18} /> Thêm Sở Giáo dục
                    </button>
                  </div>
                )}

                {childDepartments.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có Sở Giáo dục nào thuộc Tỉnh/TP này</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childDepartments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() =>
                          router.push(`/organizations-management/${dept.id}`)
                        }
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors shrink-0">
                              <Building size={24} className="text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                                {dept.name}
                              </h3>
                              {/* Simple styling for department card */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-50">
                                {dept.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone
                                      size={16}
                                      className="text-gray-400 shrink-0"
                                    />
                                    <span className="truncate">
                                      {dept.phone}
                                    </span>
                                  </div>
                                )}
                                {dept.email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail
                                      size={16}
                                      className="text-gray-400 shrink-0"
                                    />
                                    <span className="truncate">
                                      {dept.email}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Schools Tab - Danh sách trường thuộc Sở */}
          {activeTab === "schools" &&
            currentOrganization.type === "DEPARTMENT" && (
              <div className="animate-in fade-in duration-300">
                {canAddChildren && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setIsAddSchoolModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition"
                    >
                      <Plus size={18} /> Thêm trường
                    </button>
                  </div>
                )}

                {childSchools.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có trường nào thuộc Sở Giáo dục này</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childSchools.map((school) => (
                      <div
                        key={school.id}
                        onClick={() =>
                          router.push(`/organizations-management/${school.id}`)
                        }
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors shrink-0">
                              <School size={24} className="text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                                {school.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <MapPin
                                    size={16}
                                    className="text-gray-400 shrink-0"
                                  />
                                  <span className="line-clamp-1">
                                    {school.street || "Chưa có địa chỉ"}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone
                                    size={16}
                                    className="text-gray-400 shrink-0"
                                  />
                                  <span className="truncate">
                                    {school.phone}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail
                                    size={16}
                                    className="text-gray-400 shrink-0"
                                  />
                                  <span className="truncate">
                                    {school.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {activeTab === "teachers" && (
            <div className="animate-in fade-in duration-300 space-y-4">
              {canManageStaff && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setTargetRole("TEACHER");
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    <Plus size={16} /> Thêm giáo viên
                  </button>
                </div>
              )}
              <UserListTable
                users={teachers}
                emptyMessage="Chưa có giáo viên nào tại cơ sở này"
              />
            </div>
          )}

          {activeTab === "students" && (
            <div className="animate-in fade-in duration-300 space-y-4">
              {canManageStaff && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setTargetRole("STUDENT");
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    <Plus size={16} /> Thêm học sinh
                  </button>
                </div>
              )}
              <UserListTable
                users={students}
                emptyMessage="Chưa có học sinh nào tại cơ sở này"
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa tổ chức "${currentOrganization.name}"? Hành động này không thể hoàn tác.`}
        confirmText={deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
        cancelText="Hủy"
        type="danger"
      />

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={
          targetRole === "MANAGER"
            ? "Gán quản lý cơ sở"
            : targetRole === "TEACHER"
              ? "Thêm Giáo viên"
              : "Thêm Học sinh"
        }
      >
        <div className="space-y-6">
          {/* Tabs for Mode */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setAssignMode("select")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                assignMode === "select"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Chọn từ hệ thống
            </button>
            <button
              onClick={() => setAssignMode("create")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                assignMode === "create"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tạo tài khoản mới
            </button>
          </div>

          {assignMode === "select" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chọn người dùng
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                  value={selectedAssignUser}
                  onChange={(e) => setSelectedAssignUser(e.target.value)}
                >
                  <option value="">-- Chọn người dùng --</option>
                  {potentialManagers
                    .filter((u) => !managers.some((m) => m.id === u.id)) // Exclude existing managers
                    .map((user: UserItem) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {roleLabels[user.role]}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-sm text-gray-500 italic">
                Lưu ý: Bạn có thể chọn Giáo viên hoặc những người đã có vai trò
                quản lý tương ứng.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  required
                />
              </div>
              <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                Tài khoản mới sẽ được tự động cấp vai trò{" "}
                <strong>
                  {targetRole === "MANAGER"
                    ? currentOrganization.type === "SCHOOL"
                      ? "Quản lý Trường học"
                      : "Quản lý Sở/Trung tâm"
                    : targetRole === "TEACHER"
                      ? "Giáo viên"
                      : "Học sinh"}
                </strong>{" "}
                và gán vào cơ sở này.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleAssignManager}
              disabled={
                (assignMode === "select" && !selectedAssignUser) ||
                (assignMode === "create" &&
                  (!newUserForm.name ||
                    !newUserForm.email ||
                    !newUserForm.password)) ||
                assignMutation.isPending ||
                createAndAssignMutation.isPending
              }
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(assignMutation.isPending ||
                createAndAssignMutation.isPending) && (
                <Loader2 size={18} className="animate-spin" />
              )}
              Xác nhận
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal thêm Trường */}
      <Modal
        isOpen={isAddSchoolModalOpen}
        onClose={() => {
          setIsAddSchoolModalOpen(false);
          setAddSchoolProvince("");
          setAddSchoolWards([]);
        }}
        title="Thêm Trường mới"
      >
        <form className="space-y-4" onSubmit={handleCreateSchool}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Tên Trường <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Ví dụ: Trường THPT Nguyễn Huệ"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                placeholder="Số nhà, tên đường..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Tỉnh / Thành phố <span className="text-red-500">*</span>
              </label>
              <select
                value={addSchoolProvince}
                onChange={(e) => setAddSchoolProvince(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
              >
                <option value="">Chọn Tỉnh/TP</option>
                {provincesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Phường / Xã <span className="text-red-500">*</span>
              </label>
              <select
                name="ward"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
                disabled={!addSchoolProvince || loadingAddSchoolWards}
              >
                <option value="">
                  {loadingAddSchoolWards ? "Đang tải..." : "Chọn Phường/Xã"}
                </option>
                {addSchoolWards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="024..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="school@vietsign.edu.vn"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsAddSchoolModalOpen(false);
                setAddSchoolProvince("");
                setAddSchoolWards([]);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang lưu..." : "Lưu trường"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal thêm Sở Giáo Dục */}
      <Modal
        isOpen={isAddDepartmentModalOpen}
        onClose={() => {
          setIsAddDepartmentModalOpen(false);
          setAddDepartmentWards([]);
        }}
        title="Thêm Sở Giáo dục mới"
      >
        <form className="space-y-4" onSubmit={handleCreateDepartment}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Tên Sở GD <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Ví dụ: Sở Giáo dục và Đào tạo ..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                placeholder="Số nhà, tên đường..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            {/* Province automatically selected */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Tỉnh / Thành phố
              </label>
              <input
                type="text"
                value={provinceName || "Đang tải..."}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Phường / Xã <span className="text-red-500">*</span>
              </label>
              <select
                name="ward"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                required
                disabled={loadingAddDepartmentWards}
              >
                <option value="">
                  {loadingAddDepartmentWards ? "Đang tải..." : "Chọn Phường/Xã"}
                </option>
                {addDepartmentWards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="024..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="department@vietsign.edu.vn"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsAddDepartmentModalOpen(false);
                setAddDepartmentWards([]);
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang lưu..." : "Lưu Sở GD"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
