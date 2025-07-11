<!-- src/routes/bookings/+page.svelte -->
<script lang="ts">
  import { createForm, BasicForm, type Schema } from "@sjsf/form";
  import { resolver } from "@sjsf/form/resolvers/basic";
  import { translation } from "@sjsf/form/translations/en";
  import { theme } from "@sjsf/basic-theme";
  import { createFormValidator } from "@sjsf/ajv8-validator";
  import { onMount } from "svelte";
  import { getJsonFiles, getJsonContent } from "$lib/jsonUtils";

  interface User {
    firstName: string;
    lastName: string;
    email: string;
  }

  interface Booking {
    labLocation: string;
    seid: string;
    jobId?: string;
    sessionId?: string;
    sampleId?: string;
    bookingStart: string | Date;
    bookingEnd: string | Date;
    internalUser?: User;
    externalUser?: User;
    institution?: string;
    scientificSupport?: User;
    notes?: string;
    workCategory:
      | "User"
      | "Engineering"
      | "Mainenance"
      | "Environment"
      | "Repair";
    sampleSplit: boolean;
    splitSampleId?: string;
    tritium: boolean;
    beryllium: boolean;
    betaGamma: boolean;
  }

  class BookingMetadata {
    labLocation: string = "MRF";
    seid: string = "";
    jobId?: string;
    sessionId?: string;
    sampleId?: string;
    bookingStart: Date | string = "";
    bookingEnd: Date | string = "";
    internalUser?: User;
    externalUser?: User;
    institution?: string;
    scientificSupport?: User;
    notes?: string;
    workCategory:
      | "User"
      | "Engineering"
      | "Mainenance"
      | "Environment"
      | "Repair" = "User";
    sampleSplit: boolean = false;
    splitSampleId?: string;
    tritium: boolean = false;
    beryllium: boolean = false;
    betaGamma: boolean = false;
  }

  // API functions for file operations
  async function saveJsonContent(filepath: string, data: any): Promise<void> {
    const response = await fetch(`/api/save-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: filepath,
        data: data,
      }),
    });
    if (!response.ok) throw new Error(`Failed to save file: ${filepath}`);

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || `Failed to save file: ${filepath}`);
    }
  }

  function mapJSONToBooking(apiResponse: any): BookingMetadata {
    const metadata = new BookingMetadata();
    const mapped = Object.assign(metadata, apiResponse);

    // Convert date strings to Date objects
    if (mapped.bookingStart) {
      mapped.bookingStart = new Date(mapped.bookingStart);
    }
    if (mapped.bookingEnd) {
      mapped.bookingEnd = new Date(mapped.bookingEnd);
    }

    return mapped;
  }

  function mapBookingToJSON(metadata: BookingMetadata): any {
    return { ...metadata };
  }

  let bookings: BookingMetadata[] = [];
  let sortedData: BookingMetadata[] = [];
  let loading = true;
  let error: string | null = null;

  function getStatusBadge(booking: Booking): string {
    const now = new Date();
    const start = new Date(booking.bookingStart);
    const end = new Date(booking.bookingEnd);

    if (now < start) {
      return "badge-warning";
    } else if (now > end) {
      return "badge-neutral";
    } else {
      return "badge-success";
    }
  }

  function getStatus(booking: Booking): string {
    const now = new Date();
    const start = new Date(booking.bookingStart);
    const end = new Date(booking.bookingEnd);

    if (now < start) {
      return "upcoming";
    } else if (now > end) {
      return "completed";
    } else {
      return "active";
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function getUserName(booking: Booking): string {
    if (booking.internalUser) {
      return `${booking.internalUser.firstName} ${booking.internalUser.lastName}`;
    } else if (booking.externalUser) {
      return `${booking.externalUser.firstName} ${booking.externalUser.lastName}`;
    }
    return "Unknown";
  }

  function getHazardBadges(booking: Booking): string[] {
    const hazards = [];
    if (booking.tritium) hazards.push("Tritium");
    if (booking.beryllium) hazards.push("Beryllium");
    if (booking.betaGamma) hazards.push("β/γ");
    return hazards;
  }

  let selectedBooking: BookingMetadata | null = null;
  let editingBooking: BookingMetadata | null = null;
  let mrfSchema: Schema | null = null;
  let editForm: any = null;

  const validator = createFormValidator();

  // Load bookings from file system
  async function loadBookings() {
    try {
      loading = true;
      error = null;
      const files = await getJsonFiles("bookings");
      const data = await Promise.all(
        files.map((filename: string) => getJsonContent("bookings/" + filename)),
      );
      sortedData = data.map(mapJSONToBooking).sort((a, b) => {
        // Sort by booking start date
        const dateA = new Date(a.bookingStart);
        const dateB = new Date(b.bookingStart);
        return dateB.getTime() - dateA.getTime();
      });
      bookings = [...sortedData];
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load bookings";
      console.error("Error loading bookings:", err);
    } finally {
      loading = false;
    }
  }

  // Save booking to file system
  async function saveBooking(booking: BookingMetadata) {
    try {
      const filename = `bookings/booking-${booking.seid}.json`;
      const jsonData = mapBookingToJSON(booking);
      await saveJsonContent(filename, jsonData);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save booking";
      console.error("Error saving booking:", err);
      throw err;
    }
  }

  onMount(async () => {
    try {
      const schemaData = await getJsonContent("schemas/mrf_schema.json");
      mrfSchema = schemaData;
      console.log("MRF Schema loaded:", mrfSchema);
    } catch (error) {
      console.error("Failed to fetch MRF schema:", error);
    }

    // Load bookings from file system
    await loadBookings();
    console.log("Bookings loaded:", bookings);
  });

  function selectBooking(booking: BookingMetadata) {
    selectedBooking = booking;
    editingBooking = { ...booking }; // Create a copy for editing

    // Create the form with the fetched schema
    if (mrfSchema) {
      editForm = createForm({
        theme,
        schema: mrfSchema,
        resolver,
        validator,
        translation,
        onSubmit: async (data) => {
          if (selectedBooking) {
            try {
              const updatedBooking = mapJSONToBooking(data);

              // Save to file system
              await saveBooking(updatedBooking);

              // Update local state
              const index = bookings.findIndex(
                (b) => b.seid === selectedBooking.seid,
              );
              if (index !== -1) {
                bookings[index] = updatedBooking;
                bookings = [...bookings]; // Trigger reactivity
              }

              selectedBooking = null;
              editingBooking = null;
              editForm = null;
            } catch (err) {
              console.error("Failed to save booking:", err);
              // You might want to show an error message to the user
            }
          }
        },
      });

      // Convert dates to ISO strings for the form
      const formData = { ...editingBooking };
      if (formData.bookingStart instanceof Date) {
        formData.bookingStart = formData.bookingStart
          .toISOString()
          .slice(0, 16);
      }
      if (formData.bookingEnd instanceof Date) {
        formData.bookingEnd = formData.bookingEnd.toISOString().slice(0, 16);
      }

      // Set initial data
      editForm.setData(formData);
    }
  }

  function cancelEdit() {
    selectedBooking = null;
    editingBooking = null;
    editForm = null;
  }
</script>

<svelte:head>
  <title>Bookings - MRF Booking Data</title>
</svelte:head>

<div class="mb-6">
  <h1 class="text-2xl font-bold text-base-content mb-2">
    MRF Equipment Bookings
  </h1>
</div>

<div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
  <div class="stats shadow">
    <div class="stat">
      <div class="stat-title">Total Bookings</div>
      <div class="stat-value text-2xl">{bookings.length}</div>
      <div class="stat-desc">Active and completed sessions</div>
    </div>
  </div>

  <div class="stats shadow">
    <div class="stat">
      <div class="stat-title">User Sessions</div>
      <div class="stat-value text-2xl">
        {bookings.filter((b) => b.workCategory === "User").length}
      </div>
      <div class="stat-desc">Research and analysis work</div>
    </div>
  </div>

  <div class="stats shadow">
    <div class="stat">
      <div class="stat-title">Hazardous Materials</div>
      <div class="stat-value text-2xl">
        {bookings.filter((b) => b.tritium || b.beryllium || b.betaGamma).length}
      </div>
      <div class="stat-desc">Sessions with radiological hazards</div>
    </div>
  </div>
</div>

<div class="overflow-x-auto">
  <table class="table table-hover">
    <thead>
      <tr>
        <th>SEID</th>
        <th>Job ID</th>
        <th>User</th>
        <th>Institution</th>
        <th>Start</th>
        <th>End</th>
        <th>Category</th>
        <th>Status</th>
        <th>Hazards</th>
        <th>Sample Split</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      {#each bookings as booking}
        <tr
          class="cursor-pointer hover:bg-base-200"
          on:click={() => selectBooking(booking)}
        >
          <td class="font-mono text-sm">{booking.seid}</td>
          <td class="font-mono text-sm">{booking.jobId || "-"}</td>
          <td>
            <div class="font-semibold">{getUserName(booking)}</div>
            {#if booking.scientificSupport}
              <div class="text-xs text-base-content/60">
                Support: {booking.scientificSupport.firstName}
                {booking.scientificSupport.lastName}
              </div>
            {/if}
          </td>
          <td
            >{booking.institution || (booking.internalUser ? "UKAEA" : "-")}</td
          >
          <td class="text-sm">{formatDateTime(booking.bookingStart)}</td>
          <td class="text-sm">{formatDateTime(booking.bookingEnd)}</td>
          <td>
            <span class="badge badge-outline badge-sm">
              {booking.workCategory}
            </span>
          </td>
          <td>
            <span class="badge {getStatusBadge(booking)} badge-sm">
              {getStatus(booking)}
            </span>
          </td>
          <td>
            <div class="flex gap-1 flex-wrap">
              {#each getHazardBadges(booking) as hazard}
                <span class="badge badge-error badge-xs">{hazard}</span>
              {/each}
            </div>
          </td>
          <td>
            {#if booking.sampleSplit}
              <span class="badge badge-info badge-xs">Split</span>
              {#if booking.splitSampleId}
                <div class="text-xs font-mono text-base-content/60">
                  {booking.splitSampleId}
                </div>
              {/if}
            {:else}
              <span class="text-base-content/40">-</span>
            {/if}
          </td>
          <td class="max-w-xs">
            <div
              class="text-sm text-base-content/80 truncate"
              title={booking.notes}
            >
              {booking.notes || "-"}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if selectedBooking && editForm && mrfSchema}
  <div class="mt-6 p-6 bg-base-200 rounded-lg">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">
        Edit Booking - {selectedBooking.seid}
      </h2>
      <button class="btn btn-sm btn-outline" on:click={cancelEdit}>✕</button>
    </div>

    <div class="bg-white p-4 rounded">
      <BasicForm form={editForm} />
    </div>

    <div class="flex gap-2 mt-4">
      <button class="btn btn-outline" on:click={cancelEdit}>Cancel</button>
    </div>
  </div>
{:else if selectedBooking && !mrfSchema}
  <div class="mt-6 p-6 bg-base-200 rounded-lg">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">
        Edit Booking - {selectedBooking.seid}
      </h2>
      <button class="btn btn-sm btn-outline" on:click={cancelEdit}>✕</button>
    </div>

    <div class="flex items-center justify-center p-8">
      <div class="text-center">
        <div class="loading loading-spinner loading-lg mb-4"></div>
        <p class="text-base-content/70">Loading schema...</p>
      </div>
    </div>
  </div>
{/if}
