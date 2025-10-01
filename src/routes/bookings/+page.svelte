<script lang="ts">
    import { BasicForm, createForm, type Schema } from "@sjsf/form";
    import * as defaults from "$lib/form-defaults";
    import { onMount } from "svelte";
    import { getJsonContent, getJsonFiles } from "$lib/jsonUtils";
    import type { FromSchema, JSONSchema } from "json-schema-to-ts";

    // interface User {
    //     firstName?: string;
    //     lastName?: string;
    //     email?: string;
    // }

    // type WorkCategory =
    //     | "User"
    //     | "Engineering"
    //     | "Mainenance"
    //     | "Environment"
    //     | "Repair";

    // interface MRFExperiment {
    //     seid: string;
    //     bookingStart: string;
    //     bookingEnd: string;
    //     workCategory: WorkCategory;
    //     sampleSplit: boolean;
    //     tritium: boolean;
    //     beryllium: boolean;
    //     betaGamma: boolean;

    //     // Optional fields
    //     labLocation?: string;
    //     jobId?: string;
    //     sessionId?: string;
    //     sampleId?: string;
    //     internalUser?: User;
    //     externalUser?: User;
    //     institution?: string;
    //     scientificSupport?: User;
    //     notes?: string;
    //     splitSampleId?: string;
    // }

    // // Form data type (excludes the id field)
    // type MRFFormData = Omit<MRFExperiment, "id">;

    // const WORK_CATEGORIES: readonly WorkCategory[] = [
    //     "User",
    //     "Engineering",
    //     "Mainenance",
    //     "Environment",
    //     "Repair",
    // ] as const;

    const mrfSchema = {} as const;

    let allData = $state<FromSchema<typeof mrfSchema>[]>([]);
    let selectedData = $state<FromSchema<typeof mrfSchema> | null>(null);
    let showModal = $state<boolean>(false);
    let value = $state<Partial<FromSchema<typeof mrfSchema>>>({});

    type User = FromSchema<typeof mrfSchema.properties.internalUser>;

    const form = createForm({
        ...defaults,
        schema: mrfSchema,
        value: [() => value, (v: Partial<FromSchema<typeof mrfSchema>>) => (value = v)],
    });

    function openModal(data: FromSchema<typeof mrfSchema>): void {
        selectedData = data;
        value = data;  
        showModal = true;
    }

    function closeModal(): void {
        showModal = false;
        selectedData = null;
        value = {};
    }

    function handleFormSubmit(formData: FromSchema<typeof mrfSchema>): void {
        console.log("Form submitted:", formData);
        closeModal();
    }

    // function formatDate(dateString: string): string {
    //     const date = new Date(dateString);
    //     return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    // }

    function formatUser(user: User | undefined): string {
        return user ? `${user.firstName} ${user.lastName}` : "N/A";
    }

    function formatBoolean(value: boolean): string {
        return value ? "Yes" : "No";
    }

    async function loadMrfSchema() {
        try {
            const schemaFiles = await getJsonFiles("schemas");
            if (schemaFiles.length === 0) {
                console.warn("No JSON files found in the schemas directory.");
                return;
            }

            for (const file of schemaFiles) {
                console.log(`Processing schema file: ${file}`);

                const schema = await getJsonContent(`schemas/${file}`);

                console.log("Found MRF Experiment Metadata schema");

                Object.assign(mrfSchema, schema);
                console.log(
                    "Successfully loaded MRF schema with properties:",
                    Object.keys(mrfSchema),
                );
                return true;
            }

            console.warn(
                "MRF Experiment Metadata schema not found in provided files",
            );
            return false;
        } catch (error) {
            console.error("Error loading MRF schema:", error);
            throw error;
        }
    }

    async function loadMRFData()
    {
        try {
            const dataFiles = await getJsonFiles("bookings");
            if (dataFiles.length === 0) {
                console.warn("No JSON files found in the bookings directory.");
                return;
            }

            for (const file of dataFiles) {
                const data = await getJsonContent(`bookings/${file}`);
                allData.push(data);
            }
        } catch (error) {
            console.error("Error loading MRF data:", error);
        }
    }

    onMount(async () => {
        await loadMrfSchema();
        await loadMRFData();
    });
</script>

<div class="container">
    <div class="table-wrapper">
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>SEID</th>
                        <th>Job ID</th>
                        <th>Sample ID</th>
                        <!-- <th>Booking Start</th> -->
                        <th>Work Category</th>
                        <th>Internal User</th>
                        <th>External User</th>
                        <th>Institution</th>
                        <th class="actions-column">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each allData as item (item.sessionId)}
                        <tr class="data-row" role="button" tabindex="0">
                            <td class="seid-cell">{item.seid}</td>
                            <td>{item.jobId}</td>
                            <td class="sample-id">{item.sampleId}</td>
                            <!-- <td class="date-cell">{formatDate(item.bookingStart)}</td> -->
                            <td>
                                <span class="category-badge category-{item.workCategory.toLowerCase()}">
                                    {item.workCategory}
                                </span>
                            </td>
                            <td>{formatUser(item.internalUser)}</td>
                            <td>{formatUser(item.externalUser)}</td>
                            <td class="institution-cell">{item.institution}</td>
                            <td class="actions-cell">
                                <button
                                    class="btn"
                                    onclick={() => openModal(item)}
                                    aria-label="Edit experiment {item.seid}"
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>

{#if showModal}
    <div
        class="modal-overlay"
        onclick={closeModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h2 id="modal-title">Edit Experiment Data</h2>
                <button
                    class="close-btn"
                    onclick={closeModal}
                    aria-label="Close modal"
                >
                </button>
            </div>
            <div class="modal-body">
                <BasicForm {form} onSubmit={handleFormSubmit} />
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick={closeModal}
                    >Cancel</button
                >
                <button
                    class="btn btn-primary"
                    onclick={() => handleFormSubmit(value)}>Save Changes</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
    }

    .container {
        padding: 2rem;
        max-width: 1600px;
        margin: 0 auto;
    }

    .page-header {
        margin-bottom: 2rem;
        text-align: center;
    }

    .subtitle {
        margin: 0;
        color: #64748b;
        font-size: 1.1rem;
        font-weight: 400;
    }

    .table-wrapper {
        background: white;
        border-radius: 12px;
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
    }

    .table-container {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background-color: white;
    }

    thead th {
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        padding: 1rem 0.75rem;
        text-align: left;
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 2px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    tbody td {
        padding: 1rem 0.75rem;
        border-bottom: 1px solid #f1f5f9;
        color: #374151;
        vertical-align: middle;
    }

    .data-row {
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .data-row:hover {
        background-color: #f8fafc;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .data-row:focus {
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
    }

    .seid-cell {
        font-weight: 600;
        color: #1e293b;
    }

    .sample-id {
        font-size: 0.875rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }

    .date-cell {
        font-size: 0.875rem;
        color: #64748b;
    }

    .category-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .category-user {
        background-color: #dbeafe;
        color: #1e40af;
    }
    .category-engineering {
        background-color: #fef3c7;
        color: #92400e;
    }
    .category-maintenance {
        background-color: #fce7f3;
        color: #be185d;
    }
    .category-environment {
        background-color: #d1fae5;
        color: #065f46;
    }
    .category-repair {
        background-color: #fee2e2;
        color: #991b1b;
    }

    .institution-cell {
        font-style: italic;
        color: #64748b;
    }

    .actions-column {
        width: 120px;
        text-align: center;
    }

    .actions-cell {
        text-align: center;
    }

    .edit-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .edit-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .edit-btn:active {
        transform: translateY(0);
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 0;
        animation: fadeIn 0.2s ease forwards;
    }

    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }

    .modal-content {
        background-color: white;
        border-radius: 16px;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        transform: scale(0.95) translateY(20px);
        animation: slideIn 0.2s ease forwards;
    }

    @keyframes slideIn {
        to {
            transform: scale(1) translateY(0);
        }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e2e8f0;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e293b;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        border-radius: 8px;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .close-btn:hover {
        background-color: #f1f5f9;
        color: #374151;
    }

    .modal-body {
        padding: 2rem;
        overflow-y: auto;
        max-height: calc(90vh - 200px);
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 1.5rem 2rem;
        border-top: 1px solid #e2e8f0;
        background-color: #f8fafc;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }

    .btn-secondary {
        background-color: #f1f5f9;
        color: #475569;
    }

    .btn-secondary:hover {
        background-color: #e2e8f0;
    }

    .btn-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
    }

    .btn-primary:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    :global(.modal-body input),
    :global(.modal-body textarea),
    :global(.modal-body select) {
        background-color: white !important;
        color: #1e293b !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        padding: 0.75rem !important;
        font-size: 0.875rem !important;
        transition: border-color 0.2s ease !important;
    }

    :global(.modal-body input:focus),
    :global(.modal-body textarea:focus),
    :global(.modal-body select:focus) {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }

    :global(.modal-body label) {
        color: #374151 !important;
        font-weight: 500 !important;
        margin-bottom: 0.5rem !important;
        display: block !important;
    }

    :global(.modal-body .form-group) {
        margin-bottom: 1.5rem !important;
    }

    :global(.modal-body input[type="checkbox"]) {
        width: auto !important;
        margin-right: 0.5rem !important;
    }

    /* Responsive design */
    @media (max-width: 1024px) {
        .container {
            padding: 1rem;
        }

        .modal-content {
            width: 95%;
        }

        .modal-header,
        .modal-body,
        .modal-footer {
            padding: 1rem;
        }
    }

    @media (max-width: 768px) {
        thead th,
        tbody td {
            padding: 0.5rem;
            font-size: 0.875rem;
        }

        .edit-btn {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
        }

        .category-badge {
            font-size: 0.625rem;
            padding: 0.125rem 0.5rem;
        }
    }
</style>
