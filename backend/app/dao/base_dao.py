"""
Base Data Access Object with common CRUD operations
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel

from ..core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseDAO(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base DAO class with common CRUD operations"""
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialize DAO with model and database session
        
        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db
    
    def get(self, id: Union[UUID, str, int]) -> Optional[ModelType]:
        """Get a single record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_by_id(self, id: Union[UUID, str, int]) -> Optional[ModelType]:
        """Alias for get method"""
        return self.get(id)
    
    def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        Get multiple records with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Field to order by
            order_desc: Whether to order in descending order
            filters: Dictionary of filters to apply
        """
        query = self.db.query(self.model)
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    if isinstance(value, list):
                        query = query.filter(getattr(self.model, field).in_(value))
                    else:
                        query = query.filter(getattr(self.model, field) == value)
        
        # Apply ordering
        if order_by and hasattr(self.model, order_by):
            order_field = getattr(self.model, order_by)
            if order_desc:
                query = query.order_by(desc(order_field))
            else:
                query = query.order_by(asc(order_field))
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record"""
        obj_in_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
        db_obj = self.model(**obj_in_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(
        self,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Update an existing record"""
        obj_data = db_obj.__dict__.copy()
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True) if hasattr(obj_in, 'dict') else obj_in
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: Union[UUID, str, int]) -> Optional[ModelType]:
        """Delete a record by ID"""
        obj = self.db.query(self.model).filter(self.model.id == id).first()
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        query = self.db.query(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    if isinstance(value, list):
                        query = query.filter(getattr(self.model, field).in_(value))
                    else:
                        query = query.filter(getattr(self.model, field) == value)
        
        return query.count()
    
    def exists(self, id: Union[UUID, str, int]) -> bool:
        """Check if a record exists by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first() is not None
    
    def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get a single record by a specific field"""
        if hasattr(self.model, field):
            return self.db.query(self.model).filter(getattr(self.model, field) == value).first()
        return None
    
    def get_multi_by_field(self, field: str, value: Any) -> List[ModelType]:
        """Get multiple records by a specific field"""
        if hasattr(self.model, field):
            return self.db.query(self.model).filter(getattr(self.model, field) == value).all()
        return []
    
    def search(
        self,
        search_term: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Search records across multiple fields
        
        Args:
            search_term: Term to search for
            search_fields: List of fields to search in
            skip: Number of records to skip
            limit: Maximum number of records to return
        """
        query = self.db.query(self.model)
        
        if search_term and search_fields:
            search_conditions = []
            for field in search_fields:
                if hasattr(self.model, field):
                    field_attr = getattr(self.model, field)
                    search_conditions.append(field_attr.ilike(f"%{search_term}%"))
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
        
        return query.offset(skip).limit(limit).all()
    
    def bulk_create(self, objects: List[CreateSchemaType]) -> List[ModelType]:
        """Create multiple records in bulk"""
        db_objects = []
        for obj_in in objects:
            obj_in_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
            db_obj = self.model(**obj_in_data)
            db_objects.append(db_obj)
        
        self.db.add_all(db_objects)
        self.db.commit()
        
        for db_obj in db_objects:
            self.db.refresh(db_obj)
        
        return db_objects
    
    def bulk_update(self, updates: List[Dict[str, Any]]) -> int:
        """Update multiple records in bulk"""
        if not updates:
            return 0
        
        # Group updates by ID
        for update_data in updates:
            if 'id' in update_data:
                obj_id = update_data.pop('id')
                self.db.query(self.model).filter(self.model.id == obj_id).update(update_data)
        
        self.db.commit()
        return len(updates)
    
    def get_or_create(
        self,
        defaults: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[ModelType, bool]:
        """
        Get an existing record or create a new one
        
        Returns:
            Tuple of (object, created) where created is True if object was created
        """
        instance = self.db.query(self.model).filter_by(**kwargs).first()
        
        if instance:
            return instance, False
        else:
            params = dict((k, v) for k, v in kwargs.items())
            if defaults:
                params.update(defaults)
            instance = self.model(**params)
            self.db.add(instance)
            self.db.commit()
            self.db.refresh(instance)
            return instance, True
