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
                <AutoComplete 
                    :suggestions="filteredDictionaries"
                    field="target"
                    optionGroupChildren="entries"
                    optionGroupLabel="label"
                    @complete="searchInDictionaries($event)"
                    v-model="appliedText" 
                    :dropdown="true"
                    :inputStyle="{'width':'50%'}">
                </AutoComplete>
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
import AutoComplete from 'primevue/autocomplete'
import {FilterService, FilterMatchMode} from 'primevue/api'

export default {
    components: {
        Card
        , Button
        , AutoComplete
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
            , filteredDictionaries: []
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
        , searchInDictionaries(event) {
            let query = event.query
            let tempFilteredDictionaries = []
            for (let dictionary of this.mockDictionaries) {
                let filteredEntries = FilterService.filter(dictionary.entries, ['target'], query, FilterMatchMode.CONTAINS)
                if (filteredEntries && filteredEntries.length) {
                    tempFilteredDictionaries.push({...dictionary, ...{entries: filteredEntries}})
                }
            }
            this.filteredDictionaries = tempFilteredDictionaries
        }
    }
}
</script>
