<template v-if="display">
    <Button
        v-show="display"
        ref="button"
        @click="togglePanel"
    >
        {{ index }}-{{ token.text }}
    </Button>

    <OverlayPanel ref="panel">

        <!-- source segment 下拉選單 -->
        <Dropdown v-model="tokenCopy.segmentHelper.selection.selectedPattern"
            :options="tokenCopy.segmentHelper.selection.options"
            optionLabel="dropdownOptionLabel"
            placeholder="Existing source pattern"
            :showClear="true"
            >
        </Dropdown>

        <br/>
        <Button
            @click="toggleTargetPatternDialog"
            >
            Target Pattern...
        </Button>

    </OverlayPanel>

    <!-- target pattern 對話框 -->
    <Dialog
        v-model:visible="showTargetPatternDialog" 
        @show="tokenCopy.targetPatternHelper.dialogPieces.queryOrGenerateDefaultPieces(token)"
        :maximizable="true"
        :keepInViewport="false"
        :style="{width: '100vw'}" :modal="true" :closeOnEscape="true" position="topleft"
        >
        <template #header>
            <h2>Target Pattern</h2>

            <h3 v-if="tokenCopy.segmentHelper.status.isSourcePatternNew()">New Source Pattern</h3>

            <Dropdown v-model="tokenCopy.targetPatternHelper.selection.selected"
                :options="tokenCopy.targetPatternHelper.selection.options"
                optionLabel="dropdownOptionLabel"
                placeholder="Existing target pattern"
                >
            </Dropdown>
        </template>

        <div>
            <Button icon="pi pi-replay" label="Revert" @click="tokenCopy.targetPatternHelper.dialogPieces.revertPieces" />
            <Button icon="pi pi-plus" label="Add Fixed Text" @click="tokenCopy.targetPatternHelper.dialogPieces.addFixedTextPiece" style="margin-left: .5em" />
        </div>

        <vue-horizontal responsive>
            <draggable v-model="tokenCopy.targetPatternHelper.dialogPieces.pieces" tag="transition-group" item-key="vueKey">
                <template #item="{element}">
                    <SegmentPiece :item="element"
                        @appliedTextChanged="changeAppliedText"
                        @removePiece="removePiece"
                        @isOptionalChanged="changeIsOptional"
                        >
                    </SegmentPiece>
                </template>
            </draggable>
        </vue-horizontal>

        <span 
            v-for="piece in tokenCopy.targetPatternHelper.dialogPieces.pieces.value"
            :class="piece.isOptional ? 'optional' : ''"
            :key="piece.vueKey">
                {{ piece.displayText }}
        </span>

        <div>
            <Button 
                :disabled="! isTargetPatternStorable"
                @click="token.translationHelper.saveSelectedPattern(tokenCopy.segmentHelper, tokenCopy.targetPatternHelper)"
                icon="pi pi-check" label="Save"
                >
            </Button>
        </div>

    </Dialog>
    
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import OverlayPanel from 'primevue/overlaypanel'
import Dropdown from 'primevue/dropdown'

import draggable from 'vuedraggable'
import VueHorizontal from 'vue-horizontal'

import SegmentPiece from './SegmentPiece.vue'

import { ModifiedSpacySentence, ModifiedSpacyToken } from '@/composables/sentenceManager'
import { LinearTargetPatternPiece, TargetPatternPieceAppliedTextPair } from '@/composables/targetPattern'

export default defineComponent({

    props: {
        token: ModifiedSpacyToken
        , config: Object
        , index: Number
    }
    , setup(props: any) {

        // const x = computed( () => {
        //     return props.config.offsetX  + props.index * props.config.distance
        // })

        const currentSentence: ComputedRef<ModifiedSpacySentence>|undefined = inject('currentSentence')
        if (currentSentence == undefined) {
            return
        }

        const isSegmentRoot = toRef(props.token, 'isSegmentRoot')
        const display: ComputedRef<boolean> = computed( () => {
            return isSegmentRoot.value
        })

        const panel = ref<any>(null)
        function togglePanel(event:any) {
            panel.value.toggle(event)
        }

        // target pattern dialog
        const showTargetPatternDialog = ref<Boolean>(false)
        const toggleTargetPatternDialog = () => {
            showTargetPatternDialog.value = !showTargetPatternDialog.value
        }

        const isTargetPatternStorable = computed( () => {
            return props.token.segmentHelper.status.isSourcePatternNew()
                    || props.token.targetPatternHelper.dialogPieces.isPatternNew()
        })

        const changeAppliedText = (pieceAndValue:TargetPatternPieceAppliedTextPair) => {
            // 是 child component 的事件，但物件的值不能在 child component 修改，要在這裡才能修改
            pieceAndValue.piece.appliedText = pieceAndValue.value
        }
        const removePiece = (piece: LinearTargetPatternPiece) => {
            props.token.targetPatternHelper.dialogPieces.removePiece(piece)
        }
        const changeIsOptional = (pieceAndValue:TargetPatternPieceAppliedTextPair) => {
            // 是 child component 的事件，但物件的值不能在 child component 修改，要在這裡才能修改
            // pieceAndValue.piece.isOptional = pieceAndValue.value
            console.log('pieceAndValue', pieceAndValue)
        }

        return {
            display
            , panel
            , togglePanel
            , tokenCopy: props.token
            , showTargetPatternDialog
            , toggleTargetPatternDialog
            , isTargetPatternStorable
            , changeAppliedText: changeAppliedText
            , removePiece: removePiece
            , changeIsOptional: changeIsOptional
        }
    }
    , components: {
        Button
        , Dialog
        , Dropdown
        , OverlayPanel
        , draggable
        , VueHorizontal
        , SegmentPiece
    }
})
</script>

<style>

</style>
