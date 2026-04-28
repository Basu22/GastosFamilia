from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.config import MedioPago, Categoria

router = APIRouter()

# --- MEDIOS DE PAGO ---
@router.get("/medios-pago", response_model=List[MedioPago])
def list_medios_pago(db: Session = Depends(get_session)):
    return db.exec(select(MedioPago)).all()

@router.post("/medios-pago", response_model=MedioPago)
def create_medio_pago(data: MedioPago, db: Session = Depends(get_session)):
    db.add(data)
    db.commit()
    db.refresh(data)
    return data

@router.put("/medios-pago/{id}", response_model=MedioPago)
def update_medio_pago(id: int, data: MedioPago, db: Session = Depends(get_session)):
    db_item = db.get(MedioPago, id)
    if not db_item: raise HTTPException(status_code=404, detail="No encontrado")
    
    # Compatibilidad con Pydantic v1/v2
    update_data = data.model_dump(exclude={"id"}) if hasattr(data, 'model_dump') else data.dict(exclude={"id"})
    
    for key, val in update_data.items():
        setattr(db_item, key, val)
        
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/medios-pago/{id}")
def delete_medio_pago(id: int, db: Session = Depends(get_session)):
    db_item = db.get(MedioPago, id)
    if not db_item: raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(db_item)
    db.commit()
    return {"ok": True}

# --- CATEGORIAS ---
@router.get("/categorias", response_model=List[Categoria])
def list_categorias(db: Session = Depends(get_session)):
    return db.exec(select(Categoria)).all()

@router.post("/categorias", response_model=Categoria)
def create_categoria(data: Categoria, db: Session = Depends(get_session)):
    db.add(data)
    db.commit()
    db.refresh(data)
    return data

@router.put("/categorias/{id}", response_model=Categoria)
def update_categoria(id: int, data: Categoria, db: Session = Depends(get_session)):
    db_item = db.get(Categoria, id)
    if not db_item: raise HTTPException(status_code=404, detail="No encontrado")
    
    # Compatibilidad con Pydantic v1/v2
    update_data = data.model_dump(exclude={"id"}) if hasattr(data, 'model_dump') else data.dict(exclude={"id"})
    
    for key, val in update_data.items():
        setattr(db_item, key, val)
        
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/categorias/{id}")
def delete_categoria(id: int, db: Session = Depends(get_session)):
    db_item = db.get(Categoria, id)
    if not db_item: raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(db_item)
    db.commit()
    return {"ok": True}
