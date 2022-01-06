<template>
    <Card>
        <template #header>
            {{ item.type.caption }}
        </template>
        <template #title>
            {{ item.content }}
        </template>
        <template #content>
            <div v-if="item.type.isToken">
                <Dropdown 
                    :options="mockDictionaries"
                    optionLabel="target"
                    optionGroupChildren="entries"
                    optionGroupLabel="label"
                    v-model="appliedText"
                    @input="notifyOfAppliedTextChange"
                    @change="notifyOfAppliedTextChange"
                    :editable="true"
                    >
                </Dropdown>
            </div>
            <div v-if="item.type.isText">
                <Dropdown v-model="appliedText" :options="fixedTextOptions"
                    @input="notifyOfAppliedTextChange"
                    :editable="true"
                >
                </Dropdown>
            </div>
            <div v-if="item.isPlaceholder">
                {placeholder}
                <div>
                    <Checkbox v-model="isOptional"
                        :binary="true"
                        @change="notifyOfIsOptionalChange"
                    ></Checkbox>
                    Optional
                </div>
            </div>
        </template>
        <template #footer>
            <Button 
                label="Remove" 
                @click="removeSelf"
                con="pi pi-times" class="p-button-secondary" style="margin-left: .5em" />
        </template>
    </Card>
</template>

<script>
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import { LinearTargetPatternPiece } from '@/composables/targetPatternPieceManager'

export default {
    components: {
        Card
        , Button
        , Dropdown
        , Checkbox
    }
    , data() {
        return {
            appliedText: this.item.appliedText
            , mockDictionaries: [
                {
                    label: '自訂字典'
                    , entries: [
                        {source: 'send', target: '送'}
                        , {source: 'send', target: '寄送'}
                    ]
                }
            ]
            , fixedTextOptions: [

            ]
            , isOptional: false
        }
    }
    , props: {
        item: {
            type: LinearTargetPatternPiece
        }
    }
    , methods: {
        removeSelf: function () {
            this.$emit('removePiece', this.item)
        }
        , notifyOfAppliedTextChange(event) {
            let value = undefined
            if (event.value !== undefined) {
                // change event
                value = event.value.target
            } else {
                // input event
                value = event.target.value
            }
            this.$emit('appliedTextChanged', {piece: this.item, value: value})
        }
        , notifyOfIsOptionalChange() {
            this.$emit('isOptionalChanged', {piece: this.item, value: this.isOptional})
        }
    }
}
</script>
