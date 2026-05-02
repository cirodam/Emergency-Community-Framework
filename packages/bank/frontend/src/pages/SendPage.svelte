<script lang="ts">
    import AmountDisplay from "../components/AmountDisplay.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage, selectedAccountHandle } from "../lib/session.js";
    import { sendTransferByAddress, getMyAccountByHandle, getPersons } from "../lib/api.js";
    import type { AccountDto, PersonDto } from "../lib/api.js";

    const s = $derived($session!);
    const fromHandle = $derived($selectedAccountHandle || s.primaryAccountHandle);

    let fromAccount: AccountDto | null = $state(null);
    let toInputValue  = $state("");
    let toAddress     = $state(""); // the resolved address to submit
    let amount        = $state("");
    let memo          = $state("");
    let error         = $state("");
    let success       = $state(false);
    let loading       = $state(false);

    // Autocomplete state
    let allPersons: PersonDto[] = $state([]);
    let suggestions: PersonDto[] = $state([]);
    let showDropdown = $state(false);
    let activeIndex  = $state(-1);

    $effect(() => {
        if (fromHandle) {
            getMyAccountByHandle(fromHandle).then(a => { fromAccount = a; }).catch(() => {});
        }
        getPersons().then(p => { allPersons = p; }).catch(() => {});
    });

    function onToInput() {
        const q = toInputValue.toLowerCase();
        if (q.length === 0) {
            suggestions = [];
            showDropdown = false;
            toAddress = "";
            return;
        }
        suggestions = allPersons.filter(p =>
            !p.disabled && !p.retired &&
            (p.handle.includes(q) ||
             `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
        ).slice(0, 6);
        showDropdown = suggestions.length > 0;
        activeIndex = -1;
        // If the input is a raw handle/address, allow submitting it directly
        toAddress = toInputValue.trim();
    }

    function selectPerson(person: PersonDto) {
        toInputValue = `${person.firstName} ${person.lastName}`;
        toAddress = person.handle;
        showDropdown = false;
        suggestions = [];
    }

    function onToKeydown(e: KeyboardEvent) {
        if (!showDropdown) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            selectPerson(suggestions[activeIndex]);
        } else if (e.key === "Escape") {
            showDropdown = false;
        }
    }

    function onToBlur() {
        setTimeout(() => { showDropdown = false; }, 150);
    }

    async function submit() {
        error = "";
        const amt = parseFloat(amount);
        if (!toAddress.trim()) { error = "Enter a recipient handle (e.g. alice or savings@alice)"; return; }
        if (isNaN(amt) || amt <= 0) { error = "Enter a valid amount"; return; }

        loading = true;
        try {
            await sendTransferByAddress(toAddress.trim(), amt, memo.trim() || undefined);
            success = true;
            toInputValue = "";
            toAddress = "";
            amount = "";
            memo = "";
        } catch (e) {
            error = e instanceof Error ? e.message : "Transfer failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="send-page">
    <div class="top-bar">
        <button class="back-btn" onclick={() => currentPage.go("account")}>‹ Back</button>
    </div>

    <h2 class="page-title">Send</h2>

    {#if fromAccount}
        <div class="from-banner">
            <span class="from-label">From</span>
            <span class="from-name">{fromAccount.label}</span>
            <span class="from-bal">{fromAccount.amount.toLocaleString()} {fromAccount.currency}</span>
        </div>
    {/if}

    {#if success}
        <div class="success-card">
            <div class="success-icon">✓</div>
            <p>Transfer sent!</p>
            <button class="btn-secondary" onclick={() => { success = false; currentPage.go("account"); }}>
                Back to account
            </button>
            <button class="btn-link" onclick={() => success = false}>Send another</button>
        </div>
    {:else}
        <ErrorBanner message={error} />

        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label class="field">
                <span>Recipient</span>
                <div class="to-wrapper">
                    <input
                        type="text"
                        bind:value={toInputValue}
                        oninput={onToInput}
                        onkeydown={onToKeydown}
                        onblur={onToBlur}
                        placeholder="Name or handle (e.g. alice)"
                        autocomplete="off"
                        spellcheck={false}
                        disabled={loading}
                    />
                    {#if showDropdown}
                        <ul class="suggestions" role="listbox">
                            {#each suggestions as person, i}
                                <li
                                    class="suggestion-item {i === activeIndex ? 'active' : ''}"
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    onmousedown={() => selectPerson(person)}
                                >
                                    <span class="suggestion-name">{person.firstName} {person.lastName}</span>
                                    <span class="suggestion-handle">@{person.handle}</span>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
                {#if toAddress && toAddress !== toInputValue}
                    <span class="resolved-hint">→ @{toAddress}</span>
                {/if}
            </label>

            <label class="field">
                <span>Amount ({fromAccount?.currency ?? "kin"})</span>
                <input
                    type="number"
                    bind:value={amount}
                    placeholder="0"
                    min="0.01"
                    step="0.01"
                    inputmode="decimal"
                    disabled={loading}
                />
            </label>

            <label class="field">
                <span>Memo <small>(optional)</small></span>
                <input
                    type="text"
                    bind:value={memo}
                    placeholder="What's this for?"
                    disabled={loading}
                />
            </label>

            <button type="submit" class="btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send"}
            </button>
        </form>
    {/if}
</div>

<style>
    .send-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .send-page { padding-bottom: 2rem; max-width: 560px; }
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }

    .field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.1rem; }

    .field span { font-size: 0.85rem; font-weight: 500; color: #475569; }

    .field small { font-weight: 400; opacity: 0.6; }

    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }

    .field input:focus { border-color: #2563eb; }

    .to-wrapper { position: relative; }

    .to-wrapper input { width: 100%; box-sizing: border-box; }

    .suggestions {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        list-style: none;
        padding: 0.25rem 0;
        margin: 0;
        z-index: 100;
    }

    .suggestion-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        cursor: pointer;
        transition: background 0.1s;
    }

    .suggestion-item:hover,
    .suggestion-item.active { background: #eff6ff; }

    .suggestion-name { font-weight: 500; color: #1e293b; font-size: 0.95rem; }

    .suggestion-handle { color: #94a3b8; font-size: 0.82rem; }

    .resolved-hint {
        font-size: 0.78rem;
        color: #64748b;
        padding-left: 0.25rem;
    }

    .btn-primary {
        width: 100%;
        padding: 0.9rem;
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: background 0.15s;
    }

    .btn-primary:disabled { background: #93c5fd; cursor: default; }
    .btn-primary:not(:disabled):active { background: #1d4ed8; }

    .success-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem 1rem;
        text-align: center;
    }

    .success-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .success-card p { font-size: 1.2rem; font-weight: 600; margin: 0; }

    .btn-secondary {
        padding: 0.75rem 2rem;
        background: #f1f5f9;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
    }

    .btn-link {
        background: none;
        border: none;
        color: #2563eb;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: underline;
    }

    .top-bar {
        margin-bottom: 1rem;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        color: #2563eb;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
    }
    .back-btn:hover { text-decoration: underline; }

    .from-banner {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 0.65rem 1rem;
        margin-bottom: 1.25rem;
        font-size: 0.875rem;
    }

    .from-label {
        font-weight: 700;
        color: #1d4ed8;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.05em;
    }

    .from-name { font-weight: 600; color: #1e40af; }

    .from-bal { color: #3b82f6; margin-left: auto; font-variant-numeric: tabular-nums; }
</style>

