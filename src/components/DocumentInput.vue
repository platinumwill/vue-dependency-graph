<template>
    <div>
    <Dialog header="Input Document" v-model:visible="displayDocumentInput" :style="{width: '50vw'}" :modal="true">
        <Textarea ref="documentText" v-model="documentText" rows="10" cols="70" />
        <br/>
        <Button label="Submit" @click="submitDocumentText"/>
    </Dialog>
    </div>
</template>

<script>
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { mapActions } from 'vuex'

export default {
    data() {
        return {
            displayDocumentInput: true
            , documentText: "Samuel L. Jackson sent an email to Stanford University. He didn't get a reply."
        }
    }
    , mounted() {
        this.focusTextArea()
    }
    , methods: {
        focusTextArea() {
            this.$refs.documentText.$el.focus()
        }
        , submitDocumentText() {
            this.parseAndStoreDocument(this.documentText)
            this.displayDocumentInput = false
        }
        , ...mapActions([
            "parseAndStoreDocument"
        ])
    }
    , components: {
        Dialog
        , Textarea
        , Button
    }
}

</script>
