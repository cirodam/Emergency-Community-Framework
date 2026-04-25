<script lang="ts">
    interface Props {
        value: string;
        maxLength?: number;
        onchange?: (val: string) => void;
    }
    let { value = $bindable(""), maxLength = 6, onchange }: Props = $props();

    const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

    function press(d: string) {
        if (d === "⌫") {
            value = value.slice(0, -1);
        } else if (d && value.length < maxLength) {
            value = value + d;
        }
        onchange?.(value);
    }

    const dots = $derived(
        Array.from({ length: maxLength }, (_, i) => i < value.length ? "●" : "○").join(" ")
    );
</script>

<div class="pin-pad">
    <div class="dots" aria-label="PIN entry">{dots}</div>
    <div class="grid">
        {#each digits as d}
            <button
                class="key"
                class:empty={!d && d !== "0"}
                disabled={!d && d !== "0"}
                onclick={() => press(d)}
                aria-label={d === "⌫" ? "Backspace" : d}
            >
                {d}
            </button>
        {/each}
    </div>
</div>

<style>
    .pin-pad { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }

    .dots { font-size: 1.4rem; letter-spacing: 0.6em; color: #0f172a; min-height: 2rem; }

    .grid {
        display: grid;
        grid-template-columns: repeat(3, 5rem);
        gap: 0.75rem;
    }

    .key {
        height: 5rem;
        width: 5rem;
        border-radius: 50%;
        border: none;
        background: #f1f5f9;
        font-size: 1.4rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.1s;
        color: #0f172a;
    }

    .key:active { background: #cbd5e1; }

    .key.empty {
        background: transparent;
        cursor: default;
    }
</style>
