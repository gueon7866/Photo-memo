import { useState,useCallback,useEffect } from "react";
import {createPost} from "../api/postApi"


export function usePosts(){

    const [items, setItems]=useState([])
    const [loading, setLoading]=useState(false)


    const load = useCallback(async()=>{
        setLoading(true)

        try {
            
        } catch (error) {
            
        }


    })

    const add = useCallback(async({title, content, fileKeys=[]})=>{

        const created = await createPost({title, content, fileKeys})


        setItems((prev)=>[created,...prev])
    
        return created
    
    },[])


    return {
        items,
        loading,
        load,
        add
    }
}