<template>
    <div>
        <button @click="openTranslationPatternWindow">Add Pattern Segment</button>
        <Dialog header="Header" v-model:visible="displayModal" :style="{width: '50vw'}" :modal="true" :closeOnEscape="true" position="topleft">
            <Card>
                <template #header>
                </template>
                <template #title>
                    Advanced Card
                </template>
                <template #content>
                </template>
                <template #footer>
                    <Button icon="pi pi-check" label="Save" />
                    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" style="margin-left: .5em" />
                </template>
            </Card>
            <Card>
                <template #header>
                </template>
                <template #title>
                    Advanced Card
                </template>
                <template #content>
                </template>
                <template #footer>
                    <Button icon="pi pi-check" label="Save" />
                    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" style="margin-left: .5em" />
                </template>
            </Card>
        </Dialog>
    </div>
</template>

<script>
// import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog'
import Card from 'primevue/card'
import Button from 'primevue/button'

export default {
    components: {
        Dialog
        , Card
        , Button
    }
    , data() {
        return {
            displayModal: false
        }
    }
    , methods: {
        openTranslationPatternWindow: function() {
            console.log('open translation pattern window');
            this.displayModal = !this.displayModal
            console.log(this.displayModal)
        }
    }
}
</script>
<style>
    /* @import '../assets/css/primevue-bootstrap4-dark-blue-theme.css'; */
    @import '../../node_modules/primevue/resources/themes/bootstrap4-dark-blue/theme.css';
    @import '../../node_modules/primevue/resources/primevue.css';
    @import '../../node_modules/primeicons/primeicons.css';
    /* @import '../assets/css/primevue.css'; */
    /* .p-dialog-content {
        background-color: black;
        border-style: solid;
        border-color: white;
    } */
</style>