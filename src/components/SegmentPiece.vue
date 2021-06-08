<template>
    <Card>
        <template #header>
            {{ item.type }}
        </template>
        <template #title>
            {{ item.content }}
        </template>
        <template #content>
            <div v-if="item.type == 'Lemma'">
                <AutoComplete>
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
import AutoComplete from 'primevue/autocomplete';

export default {
    components: {
        Card
        , Button
        , AutoComplete
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
    }
}
</script>
