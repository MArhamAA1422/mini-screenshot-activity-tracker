/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
} from "lucide-react";
import { format, subDays, addDays, isToday, parseISO } from "date-fns";
import { ScreenshotThumbnail } from "../../components/ScreenshotThumbnail";

interface Screenshot {
  id: number;
  filePath: string;
  fileUrl: string;
  capturedAt: string;
  imageData?: string; // Optional: if backend provides base64
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
  };
  date: string;
  totalScreenshots: number;
  groups: ScreenshotGroup[];
  imagesEmbedded?: boolean;
}

type ViewMode = "timeline" | "hourly" | "detailed";

export default function EmployeeScreenshotsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  const [data, setData] = useState<GroupedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedHours, setExpandedHours] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<unknown>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalScreenshot, setModalScreenshot] = useState<Screenshot | null>(
    null
  );

  // Image blob URLs for authenticated loading
  const [imageBlobUrls, setImageBlobUrls] = useState<Map<number, string>>(
    new Map()
  );
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Map<number, boolean>
  >(new Map());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchScreenshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, selectedDate]);

  // Close modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (modalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [modalOpen]);

  const fetchScreenshots = async () => {
    setIsLoading(true);
    setError("");

    // Cleanup old blob URLs
    imageBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    setImageBlobUrls(new Map());
    setImageLoadingStates(new Map());
    setImageErrors(new Set());

    try {
      const token = localStorage.getItem("token");

      // Try to request with embedded images first
      const response = await fetch(
        `/api/admin/employees/${employeeId}/screenshots/grouped?date=${selectedDate}&includeImages=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load screenshots");
      }

      const result = await response.json();
      setData(result);

      // Auto-expand all in timeline view
      if (viewMode === "timeline") {
        const allGroups = new Set(
          result.groups.map(
            (g: ScreenshotGroup) => `${g.hour}-${g.minuteBucket}`
          )
        );
        setExpandedGroups(allGroups);
      }

      // If images are NOT embedded, fetch them separately
      if (!result.imagesEmbedded) {
        loadAllImagesWithAuth(result.groups);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load screenshots");
    } finally {
      setIsLoading(false);
    }
  };

  // Load images with authentication (fallback if not embedded)
  const loadAllImagesWithAuth = async (groups: ScreenshotGroup[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const newBlobUrls = new Map<number, string>();
    const loadingStates = new Map<number, boolean>();
    const errors = new Set<number>();

    const allScreenshots: Screenshot[] = [];
    groups.forEach((group) => {
      allScreenshots.push(...group.screenshots);
    });

    // Load in batches
    const batchSize = 10;
    for (let i = 0; i < allScreenshots.length; i += batchSize) {
      const batch = allScreenshots.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (screenshot) => {
          loadingStates.set(screenshot.id, true);
          setImageLoadingStates(new Map(loadingStates));

          try {
            const response = await fetch(screenshot.fileUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            newBlobUrls.set(screenshot.id, blobUrl);
            loadingStates.set(screenshot.id, false);
          } catch (error) {
            console.error(`Failed to load screenshot ${screenshot.id}:`, error);
            errors.add(screenshot.id);
            loadingStates.set(screenshot.id, false);
          }

          setImageBlobUrls(new Map(newBlobUrls));
          setImageLoadingStates(new Map(loadingStates));
          setImageErrors(new Set(errors));
        })
      );
    }
  };

  const getHourlyGroups = () => {
    if (!data) return [];

    const hourlyMap = new Map<number, ScreenshotGroup[]>();
    data.groups.forEach((group) => {
      if (!hourlyMap.has(group.hour)) {
        hourlyMap.set(group.hour, []);
      }
      hourlyMap.get(group.hour)!.push(group);
    });

    return Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, groups]) => ({
        hour,
        groups,
        totalCount: groups.reduce((sum, g) => sum + g.count, 0),
      }));
  };

  const toggleHour = (hour: number) => {
    const newExpanded = new Set(expandedHours);
    if (newExpanded.has(hour)) {
      newExpanded.delete(hour);
    } else {
      newExpanded.add(hour);
    }
    setExpandedHours(newExpanded);
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
    if (viewMode === "hourly") {
      const allHours = new Set(data.groups.map((g) => g.hour));
      setExpandedHours(allHours);
    } else {
      const allGroups = new Set(
        data.groups.map((g) => `${g.hour}-${g.minuteBucket}`)
      );
      setExpandedGroups(allGroups);
    }
  };

  const collapseAll = () => {
    setExpandedHours(new Set());
    setExpandedGroups(new Set());
  };

  const goToPreviousDay = () => {
    const date = parseISO(selectedDate);
    setSelectedDate(format(subDays(date, 1), "yyyy-MM-dd"));
  };

  const goToNextDay = () => {
    const date = parseISO(selectedDate);
    const nextDay = addDays(date, 1);
    if (nextDay <= new Date()) {
      setSelectedDate(format(nextDay, "yyyy-MM-dd"));
    }
  };

  const goToToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const openModal = (screenshot: Screenshot) => {
    setModalScreenshot(screenshot);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalScreenshot(null);
  };

  // Render screenshot card - uses imageData if available, otherwise blob URL
  const renderScreenshotCard = (
    screenshot: Screenshot,
    size: "small" | "medium" = "medium"
  ) => {
    // Use imageData (embedded) if available, otherwise use blob URL
    const imageSrc = screenshot.imageData || imageBlobUrls.get(screenshot.id);
    const isLoadingImg = imageLoadingStates.get(screenshot.id);
    const hasError = imageErrors.has(screenshot.id);

    return (
      <div
        key={screenshot.id}
        className={`group relative bg-gray-200 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-500 transition cursor-pointer ${
          size === "small" ? "aspect-video" : "aspect-video"
        }`}
        onClick={() => openModal(screenshot)}
      >
        {isLoadingImg && !imageSrc && !hasError && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-1" />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        )}

        {hasError && !imageSrc && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
            <p className="text-xs text-red-600">Failed to load</p>
          </div>
        )}

        {imageSrc && (
          <>
            <ScreenshotThumbnail
              src={imageSrc}
              alt={`Screenshot at ${format(
                new Date(screenshot.capturedAt),
                "HH:mm:ss"
              )}`}
            />

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(screenshot);
                }}
                className="text-white opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/20 rounded-lg"
                title="View full size"
              ></button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
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
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Previous day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <button
                onClick={goToNextDay}
                disabled={isToday(parseISO(selectedDate))}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next day"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              {!isToday(parseISO(selectedDate)) && (
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                >
                  Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-2 ${
                  viewMode === "timeline"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode("hourly")}
                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-2 ${
                  viewMode === "hourly"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Hourly
              </button>
              <button
                onClick={() => setViewMode("detailed")}
                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-2 ${
                  viewMode === "detailed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {data && !isLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {format(parseISO(selectedDate), "MMMM d, yyyy")}
                  {isToday(parseISO(selectedDate)) && (
                    <span className="ml-2 text-blue-600 font-medium">
                      (Today)
                    </span>
                  )}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.totalScreenshots} screenshot
                  {data.totalScreenshots !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {imageBlobUrls.size > 0 &&
                    `${imageBlobUrls.size} of ${data.totalScreenshots} loaded`}
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
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">
                Error loading screenshots
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading screenshots...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.groups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No screenshots found
            </h3>
          </div>
        )}

        {/* Timeline View */}
        {!isLoading &&
          data &&
          data.groups.length > 0 &&
          viewMode === "timeline" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {data.groups
                .flatMap((group) => group.screenshots)
                .map((screenshot) => renderScreenshotCard(screenshot, "small"))}
            </div>
          )}

        {/* Hourly View */}
        {!isLoading &&
          data &&
          data.groups.length > 0 &&
          viewMode === "hourly" && (
            <div className="space-y-4">
              {getHourlyGroups().map(({ hour, groups, totalCount }) => {
                const isExpanded = expandedHours.has(hour);

                return (
                  <div
                    key={hour}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleHour(hour)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}

                        <div className="text-left">
                          <div className="text-xl font-bold text-gray-900">
                            {String(hour).padStart(2, "0")}:00
                          </div>
                          <div className="text-sm text-gray-600">
                            {totalCount} screenshot{totalCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {groups.flatMap((group) =>
                            group.screenshots.map((screenshot) =>
                              renderScreenshotCard(screenshot)
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {/* Detailed View */}
        {!isLoading &&
          data &&
          data.groups.length > 0 &&
          viewMode === "detailed" && (
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
                      onClick={() =>
                        toggleGroup(group.hour, group.minuteBucket)
                      }
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
                            {group.count} screenshot
                            {group.count !== 1 ? "s" : ""}
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
                          {group.screenshots.map((screenshot) =>
                            renderScreenshotCard(screenshot)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {/* Full-Screen Modal */}
      {modalOpen && modalScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={closeModal}
        >
          <div
            className="relative max-w-7xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-lg transition"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Info */}
            <div className="absolute -top-12 left-0 text-white text-sm">
              <p>
                {format(
                  new Date(modalScreenshot.capturedAt),
                  "MMMM d, yyyy 'at' HH:mm:ss"
                )}
              </p>
            </div>

            {/* Image */}
            <div className="bg-white rounded-lg overflow-hidden">
              {modalScreenshot.imageData ||
              imageBlobUrls.get(modalScreenshot.id) ? (
                <img
                  src={
                    modalScreenshot.imageData ||
                    imageBlobUrls.get(modalScreenshot.id)
                  }
                  alt="Screenshot preview"
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
