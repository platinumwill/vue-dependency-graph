<template>
    <div>
        <button @click="openTranslationPatternWindow">Add Pattern Segment</button>
<Dialog header="Header" v-model:visible="displayModal" :style="{width: '50vw'}" :modal="true">
    <p class="p-m-0">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
        laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
</Dialog>
    </div>
</template>

<script>
// import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
export default {
    components: {
        Dialog
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
    .p-dialog-content {
        background-color: black;
        border-style: solid;
        border-color: white;
    }
</style>