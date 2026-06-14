<script setup>
import { inject, computed } from 'vue'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { APP_STATE_KEY } from '../composables/useAppState'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'

const { airfoils } = inject(AIRFOILS_KEY)
const { getState, setState } = inject(APP_STATE_KEY)
const { focusedKey } = inject(FOCUSED_PARAM_KEY)

const isVisible = computed(() => focusedKey.value === 'airfoilProfile')
const selectedProfile = computed(() => getState().airfoilProfile)
</script>

<template>
  <aside
    v-show="isVisible"
    class="absolute left-48 top-0 bottom-0 z-20 flex flex-col w-96 bg-white/95 backdrop-blur-sm border-r border-slate-200 shadow-xl"
  >
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M1 8 C4 3, 12 3, 15 8 C12 13, 4 13, 1 8Z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Airfoil</span>
    </div>

    <div class="overflow-y-auto flex-1">
      <table class="w-full text-xs">
        <thead>
          <tr>
            <th class="table-th text-left sticky top-0 bg-slate-50">Profile</th>
            <th class="table-th text-right sticky top-0 bg-slate-50">Zero Lift AoA</th>
            <th class="table-th text-right sticky top-0 bg-slate-50">Stall AoA</th>
            <th class="table-th text-right sticky top-0 bg-slate-50">Stall Cl</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="airfoil in airfoils"
            :key="airfoil.profileName"
            :class="[
              'table-row transition-colors cursor-pointer',
              airfoil.profileName === selectedProfile
                ? 'bg-sky-50 text-sky-900'
                : 'text-slate-700 hover:bg-slate-50',
            ]"
            @click="setState({ airfoilProfile: airfoil.profileName })"
          >
            <td class="px-3 py-1.5 font-medium">{{ airfoil.profileName }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">
              {{ airfoil.zeroLiftAoA ? `${airfoil.zeroLiftAoA.toFixed(2)}°` : '-' }}
            </td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ airfoil.stallAoa ? `${airfoil.stallAoa}°` : '-' }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ airfoil.stallCl ? airfoil.stallCl.toFixed(3) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>
