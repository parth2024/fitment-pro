# Generated migration for products app

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductConfiguration',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('required_product_fields', models.JSONField(default=list, help_text='Required product fields')),
                ('additional_attributes', models.JSONField(default=list, help_text='Additional product attributes')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_configurations', to='tenants.tenant')),
            ],
            options={
                'verbose_name': 'Product Configuration',
                'verbose_name_plural': 'Product Configurations',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductData',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('part_number', models.CharField(help_text='Part number/ID', max_length=100)),
                ('part_terminology_name', models.CharField(help_text='Part terminology name', max_length=200)),
                ('ptid', models.CharField(help_text='PTID', max_length=100)),
                ('parent_child', models.CharField(blank=True, help_text='Parent/Child relationship', max_length=50)),
                ('additional_attributes', models.JSONField(blank=True, default=dict)),
                ('source_file', models.CharField(blank=True, help_text='Source file name', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_data', to='products.productconfiguration')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_data', to='tenants.tenant')),
            ],
            options={
                'verbose_name': 'Product Data',
                'verbose_name_plural': 'Product Data',
                'ordering': ['part_number'],
            },
        ),
        migrations.CreateModel(
            name='ProductUpload',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('filename', models.CharField(max_length=255)),
                ('file_size', models.BigIntegerField(default=0)),
                ('file_path', models.CharField(max_length=500)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('records_processed', models.IntegerField(default=0)),
                ('records_failed', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_uploads', to='tenants.tenant')),
            ],
            options={
                'verbose_name': 'Product Upload',
                'verbose_name_plural': 'Product Uploads',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='productdata',
            constraint=models.UniqueConstraint(fields=('tenant', 'part_number'), name='unique_tenant_part_number'),
        ),
    ]
