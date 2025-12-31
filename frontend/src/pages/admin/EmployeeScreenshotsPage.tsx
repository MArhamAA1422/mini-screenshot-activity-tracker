/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";

interface Screenshot {
  id: number;
  filePath: string;
  fileUrl: string;
  capturedAt: string;
}

interface ScreenshotGroup {
  hour: number;
  minuteBucket: number;
  timeRange: string;
  count: number;
  screenshots: Screenshot[];
}

interface GroupedData {
  employee: {
    id: number;
    name: string;
    screenshotInterval: number;
  };
  date: string;
  totalScreenshots: number;
  groups: ScreenshotGroup[];
}

export default function EmployeeScreenshotsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [data, setData] = useState<GroupedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<any>>(new Set());

  useEffect(() => {
    fetchScreenshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, selectedDate]);

  const fetchScreenshots = async () => {
    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/admin/employees/${employeeId}/screenshots/grouped?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load screenshots");
      }

      const result = await response.json();
      setData(result);

      const allGroups = new Set(
        result.groups.map((g: ScreenshotGroup) => `${g.hour}-${g.minuteBucket}`)
      );
      setExpandedGroups(allGroups);
    } catch (err: any) {
      setError(err.message || "Failed to load screenshots");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (hour: number, minuteBucket: number) => {
    const key = `${hour}-${minuteBucket}`;
    const newExpanded = new Set(expandedGroups);

    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }

    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    if (!data) return;
    const allGroups = new Set(
      data.groups.map((g) => `${g.hour}-${g.minuteBucket}`)
    );
    setExpandedGroups(allGroups);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/employees")}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {data?.employee.name || "Employee"} - Screenshots
                </h1>
                <p className="text-sm text-gray-600">
                  {data?.employee.screenshotInterval} min
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data && !isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Viewing:{" "}
                <strong>
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </strong>
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.totalScreenshots} screenshots
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Collapse All
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading screenshots...</p>
          </div>
        )}

        {!isLoading && data && data.groups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No screenshots found
            </h3>
            <p className="text-gray-600">
              No screenshots uploaded on{" "}
              {format(new Date(selectedDate), "MMMM d, yyyy")}
            </p>
          </div>
        )}

        {!isLoading && data && data.groups.length > 0 && (
          <div className="space-y-4">
            {data.groups.map((group) => {
              const isExpanded = expandedGroups.has(
                `${group.hour}-${group.minuteBucket}`
              );

              return (
                <div
                  key={`${group.hour}-${group.minuteBucket}`}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(group.hour, group.minuteBucket)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}

                      <div className="text-left">
                        <div className="text-lg font-semibold text-gray-900">
                          {group.timeRange}
                        </div>
                        <div className="text-sm text-gray-600">
                          {group.count} screenshot{group.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      {format(
                        new Date(
                          selectedDate +
                            "T" +
                            String(group.hour).padStart(2, "0") +
                            ":" +
                            String(group.minuteBucket).padStart(2, "0")
                        ),
                        "h:mm a"
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {group.screenshots.map((screenshot) => (
                          <div
                            key={screenshot.id}
                            className="group relative aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-500 transition cursor-pointer"
                          >
                            <img
                              src={screenshot.fileUrl}
                              alt={`Screenshot at ${format(
                                new Date(screenshot.capturedAt),
                                "HH:mm:ss"
                              )}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />

                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition flex items-center justify-center">
                              <div className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                                {format(
                                  new Date(screenshot.capturedAt),
                                  "HH:mm:ss"
                                )}
                              </div>
                            </div>

                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              {format(new Date(screenshot.capturedAt), "HH:mm")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
