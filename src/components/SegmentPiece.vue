<template>
    <Card>
        <template #header>
            {{ item.type }}
        </template>
        <template #title>
            {{ item.content }}
        </template>
        <template #content>
            <div v-if="item.type == 'POS'">
                <Dropdown 
                    :options="mockDictionaries"
                    optionLabel="target"
                    optionGroupChildren="entries"
                    optionGroupLabel="label"
                    v-model="appliedText"
                    @input="notifyOfAppliedTextChange"
                    :editable="true"
                    >
                </Dropdown>
            </div>
            <div v-if="item.type == 'Fixed'">
                <Dropdown v-model="appliedText" :options="fixedTextOptions"
                    @input="notifyOfAppliedTextChange"
                    :editable="true"
                >
                </Dropdown>
            </div>
            <div v-if="item.isPlaceholder">
                {placeholder}
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

export default {
    components: {
        Card
        , Button
        , Dropdown
    }
    , data() {
        return {
            appliedText: undefined
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
        }
    }
    , props: {
        item: {
            type: Object
        }
    }
    , methods: {
        removeSelf: function () {
            this.$emit('removePiece', this.item)
        }
        , notifyOfAppliedTextChange(event) {
            this.$emit('appliedTextChanged', {piece: this.item, text: event.target.value})
        }
    }
}
</script>
