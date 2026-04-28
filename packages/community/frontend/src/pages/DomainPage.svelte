<script lang="ts">
    import { getDomain, listUnits, listTemplates, createUnit, getPool, listPools, updateDomain, getDomainBudget, addBudgetItem, removeBudgetItem } from "../lib/api.js";
    import type { DomainDto, UnitDto, TemplateDto, PoolDto, DomainBudgetDto, BudgetItem } from "../lib/api.js";
    import { currentPage, selectedDomainId, selectedUnitId } from "../lib/session.js";

    let domain: DomainDto | null = $state(null);
    let units: UnitDto[] = $state([]);
    let budget: DomainBudgetDto | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    // Unit picker state
    let showPicker = $state(false);
    let templates = $state<TemplateDto[]>([]);
    let templatesLoading = $state(false);
    let addingType = $state<string | null>(null);
    let addError = $state("");

    // Leadership pool state
    let pool = $state<PoolDto | null>(null);
    let allPools = $state<PoolDto[]>([]);
    let showPoolPicker = $state(false);
    let assigningPool = $state(false);
    let poolError = $state("");

    // Budget state
    let showAddItem = $state(false);
    let newItemLabel = $state("");
    let newItemAmount = $state("");
    let newItemCategory = $state("other");
    let newItemNote = $state("");
    let addItemError = $state("");
    let addingItem = $state(false);
    let removingItemId = $state<string | null>(null);

    async function load(id: string) {
        loading = true;
        error = "";
        try {
            const [d, allUnits, bud] = await Promise.all([getDomain(id), listUnits(), getDomainBudget(id)]);
            domain = d;
            units = allUnits.filter(u => d.unitIds.includes(u.id));
            budget = bud;
            pool = d.poolId ? await getPool(d.poolId) : null;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load domain";
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        const id = $selectedDomainId;
        if (id) load(id);
    });

    async function openPicker() {
        showPicker = true;
        addError = "";
        if (templates.length === 0) {
            templatesLoading = true;
            try {
                templates = await listTemplates();
            } finally {
                templatesLoading = false;
            }
        }
    }

    function closePicker() {
        showPicker = false;
        addError = "";
    }

    async function addUnit(type: string) {
        if (!domain) return;
        addingType = type;
        addError = "";
        try {
            await createUnit(type, domain.id);
            await load(domain.id);
            showPicker = false;
        } catch (e) {
            addError = e instanceof Error ? e.message : "Failed to add unit";
        } finally {
            addingType = null;
        }
    }

    async function openPoolPicker() {
        showPoolPicker = true;
        poolError = "";
        if (allPools.length === 0) {
            allPools = await listPools();
        }
    }

    function closePoolPicker() {
        showPoolPicker = false;
        poolError = "";
    }

    async function assignPool(poolId: string | null) {
        if (!domain) return;
        assigningPool = true;
        poolError = "";
        try {
            const updated = await updateDomain(domain.id, { poolId });
            domain = updated;
            pool = updated.poolId ? await getPool(updated.poolId) : null;
            showPoolPicker = false;
        } catch (e) {
            poolError = e instanceof Error ? e.message : "Failed to assign pool";
        } finally {
            assigningPool = false;
        }
    }

    function back() {
        currentPage.go("domains");
    }

    function openUnit(id: string) {
        selectedUnitId.set(id);
        currentPage.go("unit");
    }

    async function doAddItem() {
        if (!domain) return;
        const amount = parseFloat(newItemAmount);
        if (!newItemLabel.trim()) { addItemError = "Label is required"; return; }
        if (isNaN(amount) || amount < 0) { addItemError = "Amount must be a positive number"; return; }
        addingItem = true; addItemError = "";
        try {
            await addBudgetItem(domain.id, {
                label:    newItemLabel.trim(),
                amount,
                category: newItemCategory,
                note:     newItemNote.trim(),
            });
            budget = await getDomainBudget(domain.id);
            showAddItem = false;
            newItemLabel = ""; newItemAmount = ""; newItemCategory = "other"; newItemNote = "";
        } catch (e) {
            addItemError = e instanceof Error ? e.message : "Failed to add item";
        } finally {
            addingItem = false;
        }
    }

    async function doRemoveItem(itemId: string) {
        if (!domain) return;
        removingItemId = itemId;
        try {
            await removeBudgetItem(domain.id, itemId);
            budget = await getDomainBudget(domain.id);
        } catch {
            // silently ignore
        } finally {
            removingItemId = null;
        }
    }

    function fmtKin(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function fmt(date: string): string {
        return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    // Types already present in this domain
    const presentTypes = $derived(new Set(units.map(u => u.type)));

</script>

<div class="domain-page">
    <div class="page-header">
        <button class="back-btn" onclick={back} aria-label="Back to domains">‹ Domains</button>
    </div>

    {#if loading}
        <div class="skeleton wide"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if domain}
        <div class="domain-header">
            <h2 class="domain-name">{domain.name}</h2>
            {#if domain.description}
                <p class="domain-desc">{domain.description}</p>
            {/if}
        </div>

        <section class="units-section">
            <div class="section-row">
                <h3 class="section-title">Functional Units</h3>
                <button class="add-btn" onclick={openPicker}>+ Add unit</button>
            </div>

            {#if units.length === 0}
                <p class="empty-msg">No units in this domain yet.</p>
            {:else}
                <div class="unit-list">
                    {#each units as unit (unit.id)}
                        <button class="unit-card" onclick={() => openUnit(unit.id)}>
                            <div class="unit-header-row">
                                <span class="unit-name">{unit.name}</span>
                                <span class="unit-type">{unit.type}</span>
                            </div>
                            {#if unit.description}
                                <p class="unit-desc">{unit.description}</p>
                            {/if}
                            <div class="unit-footer">
                                <span class="unit-stat">{unit.personIds.length} member{unit.personIds.length !== 1 ? "s" : ""}</span>
                                <span class="unit-stat">{unit.roleIds.length} role{unit.roleIds.length !== 1 ? "s" : ""}</span>
                                <span class="unit-date">Since {fmt(unit.createdAt)}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}

            {#if showPicker}
                <div class="picker">
                    <div class="picker-header">
                        <span class="picker-title">Choose a unit type</span>
                        <button class="picker-close" onclick={closePicker} aria-label="Close">✕</button>
                    </div>

                    {#if addError}
                        <div class="add-error">{addError}</div>
                    {/if}

                    {#if templatesLoading}
                        <p class="picker-loading">Loading…</p>
                    {:else}
                        <div class="template-list">
                            {#each templates as tmpl (tmpl.type)}
                                <div class="template-row" class:already={presentTypes.has(tmpl.type)}>
                                    <div class="template-info">
                                        <span class="template-label">{tmpl.label}</span>
                                        <span class="template-desc">{tmpl.description}</span>
                                    </div>
                                    <button
                                        class="template-add-btn"
                                        disabled={addingType !== null}
                                        onclick={() => addUnit(tmpl.type)}
                                    >
                                        {addingType === tmpl.type ? "Adding…" : presentTypes.has(tmpl.type) ? "Add again" : "Add"}
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </section>

        <section class="pool-section">
            <div class="section-row">
                <h3 class="section-title">Leadership Pool</h3>
                <button class="add-btn" onclick={openPoolPicker}
                    disabled={assigningPool}>
                    {pool ? "Change pool" : "Assign pool"}
                </button>
            </div>

            {#if poolError}
                <div class="pool-error">{poolError}</div>
            {/if}

            {#if pool}
                <div class="pool-card">
                    <div class="pool-card-header">
                        <span class="pool-name">{pool.name}</span>
                        <button class="unassign-btn" onclick={() => assignPool(null)}
                            disabled={assigningPool}>Unassign</button>
                    </div>
                    {#if pool.description}
                        <p class="pool-desc">{pool.description}</p>
                    {/if}
                    <p class="pool-members">{pool.personIds.length} member{pool.personIds.length !== 1 ? "s" : ""}</p>
                </div>
            {:else}
                <p class="empty-msg">No leadership pool assigned.</p>
            {/if}

            {#if showPoolPicker}
                <div class="picker">
                    <div class="picker-header">
                        <span class="picker-title">Assign a pool</span>
                        <button class="picker-close" onclick={closePoolPicker} aria-label="Close">✕</button>
                    </div>
                    {#if allPools.length === 0}
                        <p class="picker-loading">No pools exist yet. Create one on the Pools page.</p>
                    {:else}
                        <div class="template-list">
                            {#each allPools as p (p.id)}
                                <div class="template-row" class:already={p.id === domain?.poolId}>
                                    <div class="template-info">
                                        <span class="template-label">{p.name}</span>
                                        <span class="template-desc">{p.personIds.length} member{p.personIds.length !== 1 ? "s" : ""}{p.description ? " · " + p.description : ""}</span>
                                    </div>
                                    <button
                                        class="template-add-btn"
                                        disabled={assigningPool || p.id === domain?.poolId}
                                        onclick={() => assignPool(p.id)}
                                    >
                                        {p.id === domain?.poolId ? "Assigned" : assigningPool ? "…" : "Assign"}
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </section>

        <!-- ── Budget ─────────────────────────────────────────────────────── -->
        <section class="budget-section">
            <div class="section-row">
                <h3 class="section-title">Budget</h3>
                <button class="add-btn" onclick={() => { showAddItem = !showAddItem; addItemError = ""; }}>
                    {showAddItem ? "Cancel" : "+ Add item"}
                </button>
            </div>

            {#if budget}
                {#if budget.payroll.length > 0}
                    <div class="budget-group">
                        <div class="budget-group-label">Payroll</div>
                        {#each budget.payroll as row (row.roleId)}
                            <div class="budget-row">
                                <span class="budget-label">
                                    {row.title}
                                    {#if !row.memberId}<span class="vacant-tag">vacant</span>{/if}
                                </span>
                                <span class="budget-amount">{fmtKin(row.kinPerMonth)} kin/mo</span>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if budget.items.length > 0}
                    <div class="budget-group">
                        <div class="budget-group-label">Line items</div>
                        {#each budget.items as item (item.id)}
                            <div class="budget-row">
                                <span class="budget-label">
                                    {item.label}
                                    <span class="category-tag">{item.category}</span>
                                </span>
                                <span class="budget-amount-row">
                                    <span class="budget-amount">{fmtKin(item.amount)} kin/mo</span>
                                    <button
                                        class="remove-item-btn"
                                        onclick={() => doRemoveItem(item.id)}
                                        disabled={removingItemId === item.id}
                                        aria-label="Remove"
                                    >✕</button>
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if budget.payroll.length === 0 && budget.items.length === 0}
                    <p class="empty-msg">No budget items yet.</p>
                {:else}
                    <div class="budget-total-row">
                        <span class="budget-total-label">Total</span>
                        <span class="budget-total-amount">{fmtKin(budget.totals.total)} kin/mo</span>
                    </div>
                {/if}

                {#if showAddItem}
                    <div class="add-item-form">
                        {#if addItemError}<p class="form-error">{addItemError}</p>{/if}
                        <div class="form-row">
                            <input
                                class="form-input"
                                type="text"
                                bind:value={newItemLabel}
                                placeholder="Label (e.g. Compost supplies)"
                            />
                            <input
                                class="form-input amount-input"
                                type="number"
                                min="0"
                                bind:value={newItemAmount}
                                placeholder="kin/mo"
                            />
                        </div>
                        <div class="form-row">
                            <select class="form-input" bind:value={newItemCategory}>
                                <option value="supplies">Supplies</option>
                                <option value="equipment">Equipment</option>
                                <option value="services">Services</option>
                                <option value="other">Other</option>
                            </select>
                            <input
                                class="form-input"
                                type="text"
                                bind:value={newItemNote}
                                placeholder="Note (optional)"
                            />
                        </div>
                        <button class="save-item-btn" onclick={doAddItem} disabled={addingItem}>
                            {addingItem ? "Adding…" : "Add item"}
                        </button>
                    </div>
                {/if}
            {:else}
                <p class="empty-msg">Loading budget…</p>
            {/if}
        </section>
    {/if}
</div>

<style>
    .domain-page {
        padding: 1rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .domain-page { padding-bottom: 2rem; max-width: 800px; }
    }

    .page-header { margin-bottom: 1.25rem; }

    .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #3b82f6;
        padding: 0;
    }

    .domain-header { margin-bottom: 1.75rem; }

    .domain-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.4rem;
    }

    .domain-desc {
        font-size: 0.9rem;
        color: #475569;
        margin: 0;
        line-height: 1.5;
    }

    .units-section { margin-top: 0; }

    .section-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }

    .section-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin: 0;
    }

    .add-btn {
        font-size: 0.8rem;
        font-weight: 600;
        color: #3b82f6;
        background: none;
        border: 1px solid #bfdbfe;
        border-radius: 0.375rem;
        padding: 0.25rem 0.65rem;
        cursor: pointer;
        transition: background 0.15s;
    }
    .add-btn:hover { background: #eff6ff; }

    .unit-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 768px) {
        .unit-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
    }

    .unit-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;        cursor: pointer;
        text-align: left;
        width: 100%;
        font-family: inherit;
        transition: box-shadow 0.15s, border-color 0.15s, background 0.15s;
    }
    .unit-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px #eff6ff;
        background: #f8fafc;    }

    .unit-header-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .unit-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
    }

    .unit-type {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        background: #e2e8f0;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        flex-shrink: 0;
    }

    .unit-desc {
        font-size: 0.82rem;
        color: #475569;
        margin: 0;
        line-height: 1.45;
    }

    .unit-footer {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
    }

    .unit-stat {
        font-size: 0.75rem;
        color: #64748b;
    }

    .unit-date {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-left: auto;
    }

    .empty-msg {
        font-size: 0.875rem;
        color: #94a3b8;
        padding: 0.5rem 0;
    }

    .skeleton {
        height: 2.5rem;
        border-radius: 0.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
        margin-bottom: 0.5rem;
    }
    .skeleton.wide { height: 2rem; width: 70%; }
    .skeleton.short { width: 45%; height: 1.2rem; }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg {
        font-size: 0.9rem;
        color: #ef4444;
        padding: 1rem 0;
    }

    /* ── Unit picker ─────────────────────────────────────────────────────────── */

    .picker {
        margin-top: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        overflow: hidden;
        background: #fff;
    }

    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
    }

    .picker-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .picker-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        color: #94a3b8;
        padding: 0;
        line-height: 1;
    }
    .picker-close:hover { color: #475569; }

    .picker-loading {
        padding: 1rem;
        font-size: 0.875rem;
        color: #94a3b8;
    }

    .add-error {
        padding: 0.5rem 1rem;
        font-size: 0.82rem;
        color: #ef4444;
        background: #fef2f2;
        border-bottom: 1px solid #fecaca;
    }

    .template-list {
        display: flex;
        flex-direction: column;
    }

    .template-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f1f5f9;
    }
    .template-row:last-child { border-bottom: none; }
    .template-row.already { opacity: 0.6; }

    .template-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        flex: 1;
        min-width: 0;
    }

    .template-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #0f172a;
    }

    .template-desc {
        font-size: 0.78rem;
        color: #64748b;
        line-height: 1.4;
    }

    .template-add-btn {
        flex-shrink: 0;
        font-size: 0.8rem;
        font-weight: 600;
        color: #fff;
        background: #3b82f6;
        border: none;
        border-radius: 0.375rem;
        padding: 0.3rem 0.75rem;
        cursor: pointer;
        transition: background 0.15s;
        align-self: center;
    }
    .template-add-btn:hover:not(:disabled) { background: #2563eb; }
    .template-add-btn:disabled { background: #93c5fd; cursor: not-allowed; }

    /* ── Leadership pool ─────────────────────────────────────────────────────── */

    .pool-section { margin-top: 2rem; }

    .pool-error {
        padding: 0.4rem 0.75rem;
        font-size: 0.82rem;
        color: #ef4444;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .pool-card {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 0.75rem;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .pool-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .pool-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0369a1;
    }

    .pool-desc {
        font-size: 0.82rem;
        color: #0369a1;
        margin: 0;
        opacity: 0.8;
    }

    .pool-members {
        font-size: 0.78rem;
        color: #0369a1;
        opacity: 0.7;
        margin: 0;
    }

    .unassign-btn {
        font-size: 0.75rem;
        font-weight: 500;
        color: #64748b;
        background: none;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        padding: 0.2rem 0.55rem;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s;
    }
    .unassign-btn:hover:not(:disabled) { background: #f1f5f9; }
    .unassign-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Budget ──────────────────────────────────────────────────────────────── */

    .budget-section { margin-top: 2rem; }

    .budget-group {
        margin-bottom: 0.5rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        overflow: hidden;
    }

    .budget-group-label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        padding: 0.5rem 1rem 0.25rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .budget-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.55rem 1rem;
        border-bottom: 1px solid #f8fafc;
        gap: 0.75rem;
    }
    .budget-row:last-child { border-bottom: none; }

    .budget-label {
        font-size: 0.875rem;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex: 1;
        min-width: 0;
    }

    .vacant-tag {
        font-size: 0.68rem;
        font-weight: 600;
        color: #d97706;
        background: #fef3c7;
        border-radius: 9999px;
        padding: 0.1rem 0.4rem;
        flex-shrink: 0;
    }

    .category-tag {
        font-size: 0.68rem;
        font-weight: 500;
        color: #64748b;
        background: #f1f5f9;
        border-radius: 9999px;
        padding: 0.1rem 0.4rem;
        flex-shrink: 0;
        text-transform: capitalize;
    }

    .budget-amount {
        font-size: 0.875rem;
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .budget-amount-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .remove-item-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.75rem;
        color: #cbd5e1;
        padding: 0;
        line-height: 1;
        transition: color 0.15s;
    }
    .remove-item-btn:hover:not(:disabled) { color: #ef4444; }
    .remove-item-btn:disabled { opacity: 0.4; }

    .budget-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.65rem 0 0;
        border-top: 1px solid #f1f5f9;
        margin-top: 0.25rem;
    }

    .budget-total-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .budget-total-amount {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
    }

    .add-item-form {
        margin-top: 0.75rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-row {
        display: flex;
        gap: 0.5rem;
    }

    .form-input {
        flex: 1;
        font-size: 0.875rem;
        font-family: inherit;
        padding: 0.45rem 0.7rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        outline: none;
        background: #fff;
        min-width: 0;
        transition: border-color 0.15s;
    }
    .form-input:focus { border-color: #3b82f6; }
    .amount-input { max-width: 8rem; flex: 0 0 8rem; }

    .form-error {
        font-size: 0.8rem;
        color: #ef4444;
        margin: 0;
    }

    .save-item-btn {
        align-self: flex-start;
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
        background: #3b82f6;
        border: none;
        border-radius: 0.5rem;
        padding: 0.45rem 1rem;
        cursor: pointer;
        transition: background 0.15s;
    }
    .save-item-btn:hover:not(:disabled) { background: #2563eb; }
    .save-item-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
