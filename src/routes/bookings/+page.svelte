<!-- src/routes/bookings/+page.svelte -->
<script lang="ts">
  interface Booking {
    id: string;
    equipment: string;
    owner: string;
    organization: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'upcoming';
    purpose: string;
  }

  const bookings: Booking[] = [
    {
      id: 'BK001',
      equipment: 'NMR Spectrometer',
      owner: 'Dr. Sarah Johnson',
      organization: 'Chemistry Department',
      startDate: '2025-07-08',
      endDate: '2025-07-10',
      status: 'active',
      purpose: 'Protein structure analysis'
    },
    {
      id: 'BK002',
      equipment: 'X-ray Diffractometer',
      owner: 'Prof. Michael Chen',
      organization: 'Materials Science Lab',
      startDate: '2025-07-09',
      endDate: '2025-07-11',
      status: 'upcoming',
      purpose: 'Crystal structure determination'
    },
    {
      id: 'BK003',
      equipment: 'Electron Microscope',
      owner: 'Dr. Emily Rodriguez',
      organization: 'Biology Department',
      startDate: '2025-07-05',
      endDate: '2025-07-07',
      status: 'completed',
      purpose: 'Cell membrane imaging'
    },
    {
      id: 'BK004',
      equipment: 'Mass Spectrometer',
      owner: 'Dr. James Wilson',
      organization: 'Analytical Chemistry',
      startDate: '2025-07-10',
      endDate: '2025-07-12',
      status: 'upcoming',
      purpose: 'Compound identification'
    },
    {
      id: 'BK005',
      equipment: 'UV-Vis Spectrophotometer',
      owner: 'Dr. Lisa Park',
      organization: 'Biochemistry Lab',
      startDate: '2025-07-08',
      endDate: '2025-07-08',
      status: 'active',
      purpose: 'Enzyme kinetics study'
    },
    {
      id: 'BK006',
      equipment: 'FTIR Spectrometer',
      owner: 'Dr. Robert Taylor',
      organization: 'Organic Chemistry',
      startDate: '2025-07-03',
      endDate: '2025-07-04',
      status: 'completed',
      purpose: 'Functional group analysis'
    },
    {
      id: 'BK007',
      equipment: 'Centrifuge',
      owner: 'Dr. Anna Martinez',
      organization: 'Molecular Biology',
      startDate: '2025-07-11',
      endDate: '2025-07-13',
      status: 'upcoming',
      purpose: 'Sample preparation'
    },
    {
      id: 'BK008',
      equipment: 'PCR Machine',
      owner: 'Dr. Kevin Brown',
      organization: 'Genetics Lab',
      startDate: '2025-07-07',
      endDate: '2025-07-09',
      status: 'active',
      purpose: 'DNA amplification'
    }
  ];

  function getStatusBadge(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'completed':
        return 'badge-neutral';
      case 'upcoming':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Bookings - MRF Booking Data</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-base-content mb-2">Equipment Bookings</h1>
    <p class="text-base-content/70">Current and upcoming equipment reservations</p>
  </div>

  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th></th>
          <th>Equipment</th>
          <th>Owner</th>
          <th>Organization</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Status</th>
          <th>Purpose</th>
        </tr>
      </thead>
      <tbody>
        {#each bookings as booking, index}
          <tr>
            <th>{index + 1}</th>
            <td>{booking.equipment}</td>
            <td>{booking.owner}</td>
            <td>{booking.organization}</td>
            <td>{formatDate(booking.startDate)}</td>
            <td>{formatDate(booking.endDate)}</td>
            <td>
              <span class="badge {getStatusBadge(booking.status)} badge-sm">
                {booking.status}
              </span>
            </td>
            <td>{booking.purpose}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="mt-4 text-sm text-base-content/60">
    Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
  </div>
</div>